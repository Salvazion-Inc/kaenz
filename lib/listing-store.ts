import { getSupabaseAdmin } from "./supabase";
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
    status: "listed",
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
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin
    .from("yacht_listings")
    .select(
      "id, slug, created_by, status, owner_name, owner_wallet, name, hin, guests, traits, home_port, photo_urls, captain_name, captain_photo_url, captain_languages, captain_region, captain_wallet, created_at",
    )
    .eq("status", "listed")
    .order("created_at", { ascending: false });
  if (!error && data) return (data as DbRow[]).map(fromRow).map(publicListing);
  return (await readCatalog()).map(publicListing);
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
  const listing: YachtListing = {
    id,
    slug,
    createdBy: row.createdBy,
    status: "listed",
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
    status: "listed",
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
