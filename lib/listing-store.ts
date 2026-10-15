import { getSupabase, getSupabaseAdmin } from "./supabase";
import {
  LISTING_MAX_BYTES,
  listingObjectPath,
  mimeMatchesExt,
  type PreparedListingFile,
} from "./listing-files";
import {
  parseLangs,
  parseTraits,
  type CaptainLang,
  type YachtListing,
  type YachtListingStatus,
  type YachtTrait,
} from "./listings";
import {
  filesInListingFolder,
  isPublicListingStatus,
  listingStatus,
  listingStorageTargets,
} from "./yacht-owner";

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
    status: listingStatus(row.status),
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
        .filter((row) => isPublicListingStatus(row.status))
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
  status?: YachtListingStatus;
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
  const status: YachtListingStatus = row.status === "draft" ? "draft" : "listed";
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
  });
  await writeCatalog(catalog);
  return publicListing(listing);
}

const OWNED_COLUMNS =
  "id, slug, created_by, status, owner_name, owner_wallet, name, hin, guests, traits, home_port, photo_urls, captain_name, captain_photo_url, captain_languages, captain_region, captain_wallet, created_at";

async function loadCatalog(): Promise<YachtListing[] | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  await ensureBuckets();
  const { data, error } = await admin.storage.from(DOC_BUCKET).download(CATALOG);
  if (error || !data) {
    const missing = /not found|404/i.test(String(error?.message || ""));
    return missing ? [] : null;
  }
  try {
    const json = JSON.parse(await data.text()) as YachtListing[];
    return Array.isArray(json) ? json : null;
  } catch {
    return null;
  }
}

async function assertOwner(userId: string, yachtId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const { data, error } = await admin
    .from("yacht_listings")
    .select("id, created_by")
    .eq("id", yachtId)
    .maybeSingle();
  if (error && error.code !== "PGRST205") throw new Error("save");
  if (data) {
    if (data.created_by !== userId) throw new Error("forbidden");
    return;
  }
  const catalog = await loadCatalog();
  if (catalog == null) throw new Error("save");
  const row = catalog.find((item) => item.id === yachtId);
  if (!row) throw new Error("missing");
  if (row.createdBy !== userId) throw new Error("forbidden");
}

async function removeStoragePrefix(
  bucket: string,
  folder: string,
  depth = 0,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  if (depth > 4) return;
  const files: string[] = [];
  let offset = 0;
  for (;;) {
    const listed = await admin.storage.from(bucket).list(folder, { limit: 100, offset });
    if (listed.error) {
      const missing = /not found|404/i.test(listed.error.message || "");
      if (missing) break;
      throw new Error("save");
    }
    if (!listed.data?.length) break;
    const split = filesInListingFolder(folder, listed.data);
    files.push(...split.files);
    for (const child of split.folders) {
      await removeStoragePrefix(bucket, child, depth + 1);
    }
    if (listed.data.length < 100) break;
    offset += listed.data.length;
  }
  if (!files.length) return;
  const removed = await admin.storage.from(bucket).remove(files);
  if (removed.error) throw new Error("save");
}

/** Deletes kaenz-docs/<owner>/<yachtId>/* and kaenz-listings/<owner>/<yachtId>/*. */
export async function removeListingStorage(userId: string, yachtId: string) {
  const targets = listingStorageTargets(userId, yachtId);
  for (const target of targets) {
    await removeStoragePrefix(target.bucket, target.folder);
  }
  // Multipart uploads used to land at <yachtId>/* with no owner prefix.
  for (const bucket of ["kaenz-docs", "kaenz-listings"] as const) {
    await removeStoragePrefix(bucket, yachtId);
  }
}

export async function listOwnedYachtListings(userId: string): Promise<YachtListing[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return [];
  try {
    const { data, error } = await admin
      .from("yacht_listings")
      .select(OWNED_COLUMNS)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code !== "PGRST205") return [];
      const catalog = await loadCatalog();
      return (catalog || []).filter((row) => row.createdBy === userId);
    }
    return (data as DbRow[]).map(fromRow);
  } catch {
    return [];
  }
}

export async function unpublishOwnedListing(userId: string, yachtId: string) {
  listingStorageTargets(userId, yachtId);
  await assertOwner(userId, yachtId);
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const { error } = await admin
    .from("yacht_listings")
    .update({ status: "unpublished" })
    .eq("id", yachtId)
    .eq("created_by", userId);
  if (error && error.code !== "PGRST205") throw new Error("save");
  const catalog = await loadCatalog();
  if (!catalog) return;
  let changed = false;
  const next = catalog.map((row) => {
    if (row.id !== yachtId || row.createdBy !== userId) return row;
    changed = true;
    return { ...row, status: "unpublished" as const };
  });
  if (changed) await writeCatalog(next);
}

export async function deleteOwnedListing(userId: string, yachtId: string) {
  listingStorageTargets(userId, yachtId);
  await assertOwner(userId, yachtId);
  await removeListingStorage(userId, yachtId);
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const { error } = await admin
    .from("yacht_listings")
    .delete()
    .eq("id", yachtId)
    .eq("created_by", userId);
  if (error && error.code !== "PGRST205") throw new Error("save");
  const catalog = await loadCatalog();
  if (!catalog) return;
  const next = catalog.filter((row) => !(row.id === yachtId && row.createdBy === userId));
  if (next.length !== catalog.length) await writeCatalog(next);
}
