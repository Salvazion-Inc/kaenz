import { listYachtListings } from "./listing-store";
import { listingToYacht } from "./listings";
import { listingToPlace } from "./marina-listings";
import { listMarinaListings } from "./marina-store";
import { placeById, type Place } from "./places";
import {
  clampHours,
  estimateFare,
  settleCharge,
  type TripKind,
  type WhenMode,
} from "./pricing";
import { yachtById, type Yacht } from "./yachts";

export type QuoteInput = {
  yachtId: string;
  kind: TripKind;
  hours: number;
  guests: number;
  date?: string;
  whenMode?: WhenMode;
  originId: string;
  destinationId: string;
  gratuityPct?: number;
};

const KINDS: TripKind[] = ["commute", "tour", "special"];

export function parseTripKind(value: unknown): TripKind | null {
  return KINDS.includes(value as TripKind) ? (value as TripKind) : null;
}

export function parseWhenMode(value: unknown): WhenMode {
  return value === "now" ? "now" : "schedule";
}

async function resolveYacht(id: string): Promise<Yacht | undefined> {
  const listed = yachtById(id);
  if (listed) return listed;
  const rows = await listYachtListings();
  const row = rows.find((item) => item.id === id || item.slug === id);
  return row ? listingToYacht(row) : undefined;
}

async function resolvePlace(id: string): Promise<Place | undefined> {
  const known = placeById(id);
  if (known) return known;
  const rows = await listMarinaListings();
  const row = rows.find((item) => item.id === id || item.slug === id);
  return row ? listingToPlace(row) : undefined;
}

export async function quoteTrip(input: QuoteInput) {
  const kind = parseTripKind(input.kind);
  if (!kind) return { error: "kind" as const };
  const yacht = await resolveYacht(String(input.yachtId || ""));
  if (!yacht) return { error: "yacht" as const };
  const origin = await resolvePlace(String(input.originId || ""));
  const destination = await resolvePlace(String(input.destinationId || ""));
  const hours = clampHours(kind, Number(input.hours));
  const guests = Math.max(1, Math.min(Number(input.guests) || 1, yacht.guests || 13));
  const quote = estimateFare(yacht, kind, {
    hours,
    guests,
    date: input.date,
    origin,
    destination,
    whenMode: parseWhenMode(input.whenMode),
  });
  const charge = settleCharge(quote, Number(input.gratuityPct) || 0);
  return { yacht, origin, destination, quote, charge, kind, hours, guests };
}
