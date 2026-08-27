import { getSupabaseAdmin } from "./supabase";
import type { MarinaListing } from "./marina-listings";
import type { PlaceKind } from "./places";

const DOC_BUCKET = "kaenz-docs";
const CATALOG = "marina-catalog.json";

type DbRow = {
  id: string;
  slug: string;
  created_by: string | null;
  kind: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  region: string;
  dockmaster: string;
  phone: string;
  website: string;
  wallet: string;
  created_at: string;
};

function fromRow(row: DbRow): MarinaListing {
  return {
    id: row.id,
    slug: row.slug,
    createdBy: row.created_by || "",
    kind: row.kind === "port" ? "port" : "marina",
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address,
    region: row.region,
    dockmaster: row.dockmaster,
    phone: row.phone,
    website: row.website,
    wallet: row.wallet,
    createdAt: row.created_at,
  };
}

function publicListing(row: MarinaListing): MarinaListing {
  return { ...row, wallet: "" };
}

async function ensureBucket() {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.storage.createBucket(DOC_BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
  });
}

async function readCatalog(): Promise<MarinaListing[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  await ensureBucket();
  const { data, error } = await admin.storage.from(DOC_BUCKET).download(CATALOG);
  if (error || !data) return [];
  try {
    const json = JSON.parse(await data.text()) as MarinaListing[];
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function writeCatalog(rows: MarinaListing[]) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  await ensureBucket();
  const { error } = await admin.storage.from(DOC_BUCKET).upload(
    CATALOG,
    JSON.stringify(rows),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw new Error(error.message);
}

export async function listMarinaListings(): Promise<MarinaListing[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin
    .from("marina_listings")
    .select(
      "id, slug, created_by, kind, name, lat, lng, address, region, dockmaster, phone, website, wallet, created_at",
    )
    .eq("status", "listed")
    .order("created_at", { ascending: false });
  if (!error && data) return (data as DbRow[]).map(fromRow).map(publicListing);
  return (await readCatalog()).map(publicListing);
}

export async function insertMarinaListing(row: {
  createdBy: string;
  kind: PlaceKind;
  name: string;
  lat: number;
  lng: number;
  address: string;
  region: string;
  dockmaster: string;
  phone: string;
  website: string;
  wallet: string;
}): Promise<MarinaListing> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const id = crypto.randomUUID();
  const slugBase = row.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const listing: MarinaListing = {
    id,
    slug: `${slugBase || "marina"}-${id.slice(0, 8)}`,
    createdBy: row.createdBy,
    kind: row.kind === "port" ? "port" : "marina",
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    region: row.region,
    dockmaster: row.dockmaster,
    phone: row.phone,
    website: row.website,
    wallet: row.wallet,
    createdAt: new Date().toISOString(),
  };

  const { error } = await admin.from("marina_listings").insert({
    id,
    slug: listing.slug,
    created_by: row.createdBy,
    status: "listed",
    kind: listing.kind,
    name: listing.name,
    lat: listing.lat,
    lng: listing.lng,
    address: listing.address,
    region: listing.region,
    dockmaster: listing.dockmaster,
    phone: listing.phone,
    website: listing.website,
    wallet: listing.wallet,
  });
  if (!error) return publicListing(listing);

  const catalog = await readCatalog();
  catalog.unshift(listing);
  await writeCatalog(catalog);
  return publicListing(listing);
}
