import { marinaShares } from "./marina-listings";
import type { Place } from "./places";
import type { Yacht } from "./yachts";

export type TripKind = "commute" | "tour" | "special";

/** Client fare split (sums to 100%). Captain gratuity is on top. */
export const FARE_SHARES = {
  owner: 0.38,
  captain: 0.3,
  platform: 0.25,
  marinaStart: 0.035,
  marinaEnd: 0.035,
} as const;

export const GRATUITY_PCTS = [0, 15, 18, 20] as const;

export const DEFAULT_HOURS: Record<TripKind, number> = {
  commute: 2,
  tour: 4,
  special: 5,
};

const KIND_MULT: Record<TripKind, number> = {
  commute: 0.72,
  tour: 1,
  special: 1.38,
};

export type FareQuote = {
  hours: number;
  total: number;
  owner: number;
  captain: number;
  platform: number;
  marina: ReturnType<typeof marinaShares>;
};

export function defaultHoursFor(kind: TripKind, yacht?: Yacht) {
  if (kind === "commute") return Math.max(1, (yacht?.hoursMin ?? 4) - 2);
  return yacht?.hoursMin ?? DEFAULT_HOURS[kind];
}

function yachtTypeMultiplier(yacht: Yacht) {
  let m = 1;
  const cls = yacht.class.toLowerCase();
  if (cls.includes("luxury")) m *= 1.22;
  else if (cls.includes("flybridge")) m *= 1.12;
  else if (cls.includes("motor")) m *= 1.08;
  else if (cls.includes("center")) m *= 0.92;

  m *= 1 + (yacht.lengthFt - 42) * 0.007;

  for (const trait of yacht.traits ?? []) {
    if (trait === "luxurious") m *= 1.12;
    if (trait === "fast") m *= 1.05;
    if (trait === "small") m *= 0.9;
  }
  return Math.max(0.75, m);
}

function guestMultiplier(yacht: Yacht, guests: number) {
  const party = Math.max(1, Math.min(guests, yacht.guests || guests));
  const included = Math.min(4, yacht.guests || 4);
  return 1 + Math.max(0, party - included) * 0.06;
}

function dateMultiplier(date?: string) {
  if (!date) return 1;
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 1;
  const day = d.getDay();
  const month = d.getMonth();
  const weekend = day === 0 || day === 5 || day === 6;
  const peak = month >= 11 || month <= 3;
  return (weekend ? 1.16 : 1) * (peak ? 1.08 : 1);
}

export function splitFare(
  total: number,
  origin?: Place,
  destination?: Place,
) {
  const marina = marinaShares(total, origin, destination);
  const owner = Math.round(total * FARE_SHARES.owner);
  const captain = Math.round(total * FARE_SHARES.captain);
  const platform = Math.max(0, total - owner - captain - marina.total);
  return { owner, captain, platform, marina };
}

export function gratuityAmount(total: number, pct: number) {
  const safe = GRATUITY_PCTS.includes(pct as (typeof GRATUITY_PCTS)[number])
    ? pct
    : 0;
  return Math.round((total * safe) / 100);
}

export function estimateFare(
  yacht: Yacht,
  kind: TripKind,
  options?: {
    hours?: number;
    guests?: number;
    date?: string;
    origin?: Place;
    destination?: Place;
  },
): FareQuote {
  const hours = Math.max(
    1,
    options?.hours ?? defaultHoursFor(kind, yacht),
  );
  const guests = Math.max(1, options?.guests ?? 4);
  const hourly = yacht.priceFrom / Math.max(1, yacht.hoursMin);
  const raw =
    hourly *
    hours *
    KIND_MULT[kind] *
    yachtTypeMultiplier(yacht) *
    guestMultiplier(yacht, guests) *
    dateMultiplier(options?.date);
  const total = Math.max(250, Math.round(raw));
  return { hours, total, ...splitFare(total, options?.origin, options?.destination) };
}
