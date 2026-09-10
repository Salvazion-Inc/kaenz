import {
  resolveInventoryPlace,
  resolveInventoryYacht,
} from "./inventory";
import {
  clampHours,
  estimateFare,
  settleCharge,
  type TripKind,
  type WhenMode,
} from "./pricing";

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

async function resolveYacht(id: string) {
  return resolveInventoryYacht(id);
}

async function resolvePlace(id: string) {
  return resolveInventoryPlace(id);
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
