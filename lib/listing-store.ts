import { getSupabase, getSupabaseAdmin } from "./supabase";
import {
  LISTING_MAX_BYTES,
  listingObjectPath,
  mimeMatchesExt,
  type PreparedListingFile,
} from "./listing-files";
import {
  draftDeleteDecision,
  draftUpdateDecision,
  listingInsertStatus,
  nextYachtPhotoIndex,
  type YachtDraftRecord,
} from "./listing-draft";
import {
  parseLangs,
  parseTraits,
  type CaptainLang,
  type YachtListing,
  type YachtTrait,
} from "./listings";

const PHOTO_BUCKET = "kaenz-listings";
const DOC_BUCKET = "kaenz-docs";
const CATALOG = "catalog.json";

type DbRow = {
  id: string;
  slug: string;
  created_by: string | null;
  status: string;
  owner_name: string;
  owner_wallet: string;
  name: string;
  hin: string;
  guests: number;
  traits: string[] | null;
  home_port: string;
  photo_urls: string[] | null;
  captain_name: string;
  captain_photo_url: string | null;
  captain_languages: string[] | null;
  captain_region: string;
  captain_wallet: string;
  created_at: string;
};

function fromRow(row: DbRow): YachtListing {
  return {
    id: row.id,
    slug: row.slug,
    createdBy: row.created_by || "",
    status: row.status === "draft" ? "draft" : "listed",
    ownerName: row.owner_name,
    ownerWallet: row.owner_wallet,
    name: row.name,
    hin: row.hin,
    guests: row.guests,
    traits: parseTraits(row.traits),
    homePort: row.home_port,
    photos: (row.photo_urls || []).filter(Boolean),
    captainName: row.captain_name,
    captainPhoto: row.captain_photo_url || "",
    captainLanguages: parseLangs(row.captain_languages),
    captainRegion: row.captain_region,
    captainWallet: row.captain_wallet,
    createdAt: row.created_at,
  };
}

function publicListing(row: YachtListing): YachtListing {
  return {
    ...row,
    ownerWallet: "",
    captainWallet: "",
  };
}

async function ensureBuckets() {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await Promise.all([
    admin.storage.createBucket(PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
    }),
    admin.storage.createBucket(DOC_BUCKET, {
      public: false,
      fileSizeLimit: 8 * 1024 * 1024,
    }),
  ]);
}

function extOf(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".pdf")) return "pdf";
  return "jpg";
}

export async function uploadListingFile(opts: {
  listingId: string;
  kind: "photo" | "doc";
  name: string;
  file: File;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  await ensureBuckets();
  const bucket = opts.kind === "photo" ? PHOTO_BUCKET : DOC_BUCKET;
  const path = `${opts.listingId}/${opts.name}.${extOf(opts.file)}`;
  const buffer = Buffer.from(await opts.file.arrayBuffer());
  const { error } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: opts.file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  if (opts.kind === "doc") return path;
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function signListingUploads(opts: {
  userId: string;
  listingId: string;
  files: PreparedListingFile[];
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  await ensureBuckets();
  const uploads: Array<{ slot: string; path: string; signedUrl: string }> = [];
  for (const file of opts.files) {
    const path = listingObjectPath(opts.userId, opts.listingId, file.base, file.ext);
    const bucket = file.kind === "photo" ? PHOTO_BUCKET : DOC_BUCKET;
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true,
    });
    if (error || !data?.signedUrl) throw new Error("upload");
    uploads.push({ slot: file.slot, path, signedUrl: data.signedUrl });
  }
  return uploads;
}

export async function assertUploadedListingFile(opts: {
  path: string;
  kind: "photo" | "doc";
  error: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const bucket = opts.kind === "photo" ? PHOTO_BUCKET : DOC_BUCKET;
  const info = await admin.storage.from(bucket).info(opts.path);
  let size = Number(info.data?.size);
  let mime = String(info.data?.contentType || "");
  if (info.error || !info.data) {
    const name = opts.path.split("/").pop() || "";
    const folder = opts.path.slice(0, Math.max(0, opts.path.length - name.length - 1));
    const listed = await admin.storage.from(bucket).list(folder, { limit: 20, search: name });
    const hit = listed.data?.find((item) => item.name === name);
    if (listed.error || !hit) throw new Error(opts.error);
    size = Number(hit.metadata?.size);
    mime = String(hit.metadata?.mimetype || "");
  }
  if (!Number.isFinite(size) || size <= 0) throw new Error(opts.error);
  if (size > LISTING_MAX_BYTES) throw new Error("file_too_big");
  const ext = opts.path.split(".").pop() || "";
  if (!mimeMatchesExt(ext, mime)) throw new Error(opts.error);
  if (opts.kind === "doc") return opts.path;
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(opts.path);
  return pub.publicUrl;
}

async function readCatalog(): Promise<YachtListing[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  await ensureBuckets();
  const { data, error } = await admin.storage.from(DOC_BUCKET).download(CATALOG);
  if (error || !data) return [];
  try {
    const json = JSON.parse(await data.text()) as YachtListing[];
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function writeCatalog(rows: YachtListing[]) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  await ensureBuckets();
  const body = JSON.stringify(rows);
  const { error } = await admin.storage.from(DOC_BUCKET).upload(CATALOG, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function listYachtListings(): Promise<YachtListing[]> {
  const db = getSupabase() || getSupabaseAdmin();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("yacht_listings")
      .select(
        "id, slug, created_by, status, owner_name, owner_wallet, name, hin, guests, traits, home_port, photo_urls, captain_name, captain_photo_url, captain_languages, captain_region, captain_wallet, created_at",
      )
      .eq("status", "listed")
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code === "PGRST205") return [];
      return (await readCatalog())
        .filter((row) => row.status !== "draft")
        .map(publicListing);
    }
    if (data) return (data as DbRow[]).map(fromRow).map(publicListing);
  } catch {
    /* table missing or paused */
  }
  return [];
}

export async function insertYachtListing(row: {
  id: string;
  createdBy: string;
  ownerName: string;
  ownerIdUrl: string;
  ownerWallet: string;
  name: string;
  hin: string;
  guests: number;
  traits: YachtTrait[];
  homePort: string;
  photos: string[];
  captainName: string;
  captainIdUrl: string;
  captainMmcUrl: string;
  captainPhoto: string;
  captainLanguages: CaptainLang[];
  captainRegion: string;
  captainWallet: string;
  status?: "listed" | "draft";
}): Promise<YachtListing> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const id = row.id;
  const slugBase = row.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const slug = `${slugBase || "yacht"}-${id.slice(0, 8)}`;
  const status = listingInsertStatus(row.status);
  const listing: YachtListing = {
    id,
    slug,
    createdBy: row.createdBy,
    status,
    ownerName: row.ownerName,
    ownerWallet: row.ownerWallet,
    name: row.name,
    hin: row.hin.replace(/\s+/g, "").toUpperCase(),
    guests: row.guests,
    traits: row.traits,
    homePort: row.homePort,
    photos: row.photos,
    captainName: row.captainName,
    captainPhoto: row.captainPhoto,
    captainLanguages: row.captainLanguages,
    captainRegion: row.captainRegion,
    captainWallet: row.captainWallet,
    createdAt: new Date().toISOString(),
  };

  const { error } = await admin.from("yacht_listings").insert({
    id,
    slug,
    created_by: row.createdBy,
    status,
    owner_name: row.ownerName,
    owner_id_url: row.ownerIdUrl,
    owner_wallet: row.ownerWallet,
    name: row.name,
    hin: listing.hin,
    guests: row.guests,
    traits: row.traits,
    home_port: row.homePort,
    photo_urls: row.photos,
    captain_name: row.captainName,
    captain_id_url: row.captainIdUrl,
    captain_mmc_url: row.captainMmcUrl,
    captain_photo_url: row.captainPhoto,
    captain_languages: row.captainLanguages,
    captain_region: row.captainRegion,
    captain_wallet: row.captainWallet,
  });
  if (!error) return publicListing(listing);

  const catalog = await readCatalog();
  catalog.unshift({
    ...listing,
    ownerWallet: row.ownerWallet,
    captainWallet: row.captainWallet,
    ownerIdUrl: row.ownerIdUrl,
    captainIdUrl: row.captainIdUrl,
    captainMmcUrl: row.captainMmcUrl,
  } as YachtListing);
  await writeCatalog(catalog);
  return publicListing(listing);
}

const DRAFT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DRAFT_COLUMNS =
  "id, slug, created_by, status, owner_name, owner_id_url, owner_wallet, name, hin, guests, traits, home_port, photo_urls, captain_name, captain_id_url, captain_mmc_url, captain_photo_url, captain_languages, captain_region, captain_wallet, created_at";

type DraftDbRow = DbRow & {
  owner_id_url: string | null;
  captain_id_url: string | null;
  captain_mmc_url: string | null;
};

function fromDraftRow(row: DraftDbRow): YachtDraftRecord {
  return {
    ...fromRow(row),
    ownerIdUrl: row.owner_id_url || "",
    captainIdUrl: row.captain_id_url || "",
    captainMmcUrl: row.captain_mmc_url || "",
  };
}

function fromCatalogDraft(row: YachtListing): YachtDraftRecord {
  const extra = row as YachtListing & {
    ownerIdUrl?: string;
    captainIdUrl?: string;
    captainMmcUrl?: string;
  };
  return {
    ...fromRow({
      id: row.id,
      slug: row.slug,
      created_by: row.createdBy,
      status: row.status,
      owner_name: row.ownerName,
      owner_wallet: row.ownerWallet,
      name: row.name,
      hin: row.hin,
      guests: row.guests,
      traits: row.traits,
      home_port: row.homePort,
      photo_urls: row.photos,
      captain_name: row.captainName,
      captain_photo_url: row.captainPhoto,
      captain_languages: row.captainLanguages,
      captain_region: row.captainRegion,
      captain_wallet: row.captainWallet,
      created_at: row.createdAt,
    }),
    ownerIdUrl: extra.ownerIdUrl || "",
    captainIdUrl: extra.captainIdUrl || "",
    captainMmcUrl: extra.captainMmcUrl || "",
  };
}

export async function readYachtDraftRow(id: string): Promise<YachtDraftRecord | null> {
  if (!DRAFT_ID.test(id)) return null;
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const { data, error } = await admin
    .from("yacht_listings")
    .select(DRAFT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!error && data) return fromDraftRow(data as DraftDbRow);
  if (!error) return null;
  if (error.code === "PGRST205") {
    const catalog = await readCatalog();
    const row = catalog.find((item) => item.id === id);
    return row ? fromCatalogDraft(row) : null;
  }
  throw new Error("supabase");
}

export async function listOwnYachtDrafts(userId: string): Promise<YachtDraftRecord[]> {
  if (!userId) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    const { data, error } = await admin
      .from("yacht_listings")
      .select(DRAFT_COLUMNS)
      .eq("created_by", userId)
      .eq("status", "draft")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DraftDbRow[]).map(fromDraftRow);
    const catalog = await readCatalog();
    return catalog
      .filter((row) => row.status === "draft" && row.createdBy === userId)
      .map(fromCatalogDraft);
  } catch {
    return [];
  }
}

/**
 * Reuse a draft id the caller already owns. A new id is minted when none is
 * given. Someone else's row, or a yacht that is already listed, is refused.
 */
export async function claimDraftUpload(userId: string, requested: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false as const, error: "supabase" as const };
  const listingId = requested.trim();
  if (!listingId) {
    return { ok: true as const, listingId: crypto.randomUUID(), nextPhotoIndex: 0 };
  }
  if (!DRAFT_ID.test(listingId)) return { ok: false as const, error: "fields" as const };
  const existing = await readYachtDraftRow(listingId);
  if (!existing) return { ok: true as const, listingId, nextPhotoIndex: 0 };
  const decision = draftUpdateDecision(existing, userId);
  if (decision !== "update") return { ok: false as const, error: decision };
  return {
    ok: true as const,
    listingId,
    nextPhotoIndex: nextYachtPhotoIndex(existing.photos),
  };
}

export async function updateOwnYachtDraft(userId: string, next: YachtDraftRecord) {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false as const, error: "supabase" as const };
  if (!DRAFT_ID.test(next.id)) return { ok: false as const, error: "missing" as const };
  const existing = await readYachtDraftRow(next.id);
  if (!existing) return { ok: false as const, error: "missing" as const };
  const decision = draftUpdateDecision(existing, userId);
  if (decision !== "update") return { ok: false as const, error: decision };
  const patch = {
    status: next.status,
    owner_name: next.ownerName,
    owner_id_url: next.ownerIdUrl,
    owner_wallet: next.ownerWallet,
    name: next.name,
    hin: next.hin,
    guests: next.guests,
    traits: next.traits,
    home_port: next.homePort,
    photo_urls: next.photos,
    captain_name: next.captainName,
    captain_id_url: next.captainIdUrl,
    captain_mmc_url: next.captainMmcUrl,
    captain_photo_url: next.captainPhoto,
    captain_languages: next.captainLanguages,
    captain_region: next.captainRegion,
    captain_wallet: next.captainWallet,
  };
  const updated = await admin
    .from("yacht_listings")
    .update(patch)
    .eq("id", next.id)
    .eq("created_by", userId)
    .eq("status", "draft")
    .select("id");
  if (!updated.error && updated.data?.length) {
    return {
      ok: true as const,
      listing: publicListing({
        ...next,
        createdBy: existing.createdBy,
        slug: existing.slug,
        createdAt: existing.createdAt,
      }),
    };
  }
  if (updated.error?.code === "PGRST205") {
    const catalog = await readCatalog();
    const index = catalog.findIndex((item) => item.id === next.id);
    if (index < 0) return { ok: false as const, error: "missing" as const };
    const row = fromCatalogDraft(catalog[index]);
    if (draftUpdateDecision(row, userId) !== "update") {
      return { ok: false as const, error: "forbidden" as const };
    }
    catalog[index] = {
      ...next,
      createdBy: row.createdBy,
      slug: row.slug,
      createdAt: row.createdAt,
      ownerWallet: next.ownerWallet,
      captainWallet: next.captainWallet,
    };
    await writeCatalog(catalog);
    return { ok: true as const, listing: publicListing(catalog[index]) };
  }
  if (updated.error) throw new Error("save");
  return { ok: false as const, error: "forbidden" as const };
}

export async function deleteOwnYachtDraft(userId: string, id: string) {
  if (!DRAFT_ID.test(id) || !userId) return "missing" as const;
  const admin = getSupabaseAdmin();
  if (!admin) return "missing" as const;
  try {
    const { data, error } = await admin
      .from("yacht_listings")
      .select("id, created_by, status")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const decision = draftDeleteDecision(
        { createdBy: String(data.created_by || ""), status: String(data.status || "") },
        userId,
      );
      if (decision !== "delete") return decision;
      const removed = await admin
        .from("yacht_listings")
        .delete()
        .eq("id", id)
        .eq("created_by", userId)
        .eq("status", "draft");
      if (removed.error) return "missing" as const;
      return "delete" as const;
    }
  } catch {
    /* catalog fallback */
  }
  const catalog = await readCatalog();
  const row = catalog.find((item) => item.id === id) || null;
  const decision = draftDeleteDecision(row, userId);
  if (decision !== "delete") return decision;
  await writeCatalog(catalog.filter((item) => item.id !== id));
  return "delete" as const;
}
