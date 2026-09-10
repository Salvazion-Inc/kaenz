import {
  decorateBookable,
  isSeedRealId,
  SEED_REAL_NOTE,
  seedRealPlaces,
  seedRealYachts,
} from "./bookable-seed";
import { listingToYacht } from "./listings";
import { listYachtListings } from "./listing-store";
import { listingToPlace } from "./marina-listings";
import { listMarinaListings } from "./marina-store";
import { placeById, type Place } from "./places";
import { getSupabase, getSupabaseAdmin } from "./supabase";
import { yachtById, type Yacht } from "./yachts";

export type InventoryMeta = {
  source: "seed-real" | "supabase+seed-real";
  note: string;
  supabase: boolean;
};

function dedupeYachts(rows: Yacht[]) {
  const seen = new Set<string>();
  const out: Yacht[] = [];
  for (const row of rows) {
    const key = row.id || row.marinaId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (row.listing && row.id) seen.add(row.id);
    out.push(row);
  }
  return out;
}

function dedupePlaces(rows: Place[]) {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

type YachtTableRow = {
  id?: string;
  slug?: string;
  name?: string;
  class?: string;
  length_ft?: number;
  guests?: number;
  hours_min?: number;
  price_from?: number | null;
  marina?: string;
  image_url?: string;
  active?: boolean;
};

function fromYachtTable(row: YachtTableRow): Yacht | null {
  const slug = String(row.slug || "").trim();
  if (!slug || !row.name) return null;
  const seeded = yachtById(slug);
  const marinaName = String(row.marina || seeded?.marina || "");
  const marinaId = seeded?.marinaId || slug;
  const base: Yacht = seeded
    ? { ...seeded }
    : {
        id: slug,
        name: String(row.name),
        class: String(row.class || "Yacht"),
        lengthFt: Number(row.length_ft) || 0,
        guests: Number(row.guests) || 8,
        hoursMin: Number(row.hours_min) || 4,
        marina: marinaName,
        marinaId,
        image: String(row.image_url || ""),
        lat: Number.NaN,
        lng: Number.NaN,
        etaMin: 0,
        traits: ["fast"],
        captain: {
          name: "Captain",
          license: "MMC",
          rating: 0,
          trips: 0,
          photo: "",
          verified: false,
        },
        blurb: {
          en: marinaName,
          es: marinaName,
          fr: marinaName,
          it: marinaName,
          pt: marinaName,
        },
      };
  const decorated = decorateBookable(
    {
      ...base,
      id: slug,
      name: String(row.name),
      class: String(row.class || base.class),
      lengthFt: Number(row.length_ft) || base.lengthFt,
      guests: Number(row.guests) || base.guests,
      hoursMin: Number(row.hours_min) || base.hoursMin,
      marina: marinaName || base.marina,
      image: String(row.image_url || base.image),
    },
    isSeedRealId(slug) ? "seed-real" : "live",
  );
  if (row.price_from && Number(row.price_from) > 0) {
    decorated.priceFromUsd = Number(row.price_from);
  }
  return decorated;
}

async function listYachtTable(): Promise<Yacht[]> {
  const db = getSupabase();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("yachts")
      .select(
        "id, slug, name, class, length_ft, guests, hours_min, price_from, marina, image_url, active",
      )
      .eq("active", true);
    if (error || !data) return [];
    return (data as YachtTableRow[])
      .map(fromYachtTable)
      .filter((row): row is Yacht => Boolean(row));
  } catch {
    return [];
  }
}

async function ensureSeedYachts() {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    const { count, error } = await admin
      .from("yachts")
      .select("id", { count: "exact", head: true });
    if (error || (count && count > 0)) return;
    const rows = seedRealYachts().map((yacht) => ({
      slug: yacht.id,
      name: yacht.name,
      class: yacht.class,
      length_ft: yacht.lengthFt,
      guests: yacht.guests,
      hours_min: yacht.hoursMin,
      price_from: yacht.priceFromUsd,
      marina: yacht.marina,
      image_url: yacht.image,
      active: true,
    }));
    await admin.from("yachts").upsert(rows, { onConflict: "slug" });
  } catch {
    /* seed-real still serves from code if the table rejects the write */
  }
}

export async function listBookableYachts(): Promise<{
  yachts: Yacht[];
  meta: InventoryMeta;
}> {
  await ensureSeedYachts();
  const seeded = seedRealYachts();
  let listed: Yacht[] = [];
  try {
    listed = (await listYachtListings()).map((row) =>
      decorateBookable(listingToYacht(row), "live"),
    );
  } catch {
    listed = [];
  }
  const table = await listYachtTable();
  const supabase = Boolean(getSupabase());
  const yachts = dedupeYachts([...listed, ...table, ...seeded]);
  return {
    yachts,
    meta: {
      source: listed.length || table.length ? "supabase+seed-real" : "seed-real",
      note: SEED_REAL_NOTE,
      supabase,
    },
  };
}

export async function listBookablePlaces(): Promise<{
  places: Place[];
  meta: InventoryMeta;
}> {
  let listed: Place[] = [];
  try {
    listed = (await listMarinaListings()).map(listingToPlace);
  } catch {
    listed = [];
  }
  const seeded = seedRealPlaces();
  const places = dedupePlaces([...listed, ...seeded]);
  return {
    places,
    meta: {
      source: listed.length ? "supabase+seed-real" : "seed-real",
      note: SEED_REAL_NOTE,
      supabase: Boolean(getSupabase()),
    },
  };
}

export async function resolveBookableYacht(id: string) {
  const needle = String(id || "").trim();
  if (!needle) return undefined;
  const { yachts } = await listBookableYachts();
  return yachts.find((item) => item.id === needle || item.marinaId === needle);
}

export async function resolveInventoryYacht(id: string) {
  const bookable = await resolveBookableYacht(id);
  if (bookable) return bookable;
  return yachtById(id);
}

export async function resolveInventoryPlace(id: string) {
  const needle = String(id || "").trim();
  if (!needle) return undefined;
  const known = placeById(needle);
  if (known) return known;
  const { places } = await listBookablePlaces();
  return places.find((item) => item.id === needle);
}
