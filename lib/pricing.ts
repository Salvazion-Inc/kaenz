import { marinaShares } from "./marina-listings";
import { marketLabel, tripMarketHourly } from "./markets";
import type { Place } from "./places";
import type { Yacht } from "./yachts";

export type TripKind = "commute" | "tour" | "special";
export type WhenMode = "now" | "schedule";

/** Client fare split (sums to 100%). Captain gratuity is on top. */
export const FARE_SHARES = {
  owner: 0.38,
  captain: 0.3,
  platform: 0.25,
  marinaStart: 0.035,
  marinaEnd: 0.035,
} as const;

export const GRATUITY_PCTS = [0, 15, 18, 20] as const;
export const GRATUITY_MAX_PCT = 25;

export const HOURS_RANGE: Record<
  TripKind,
  { min: number; max: number; default: number; step: number }
> = {
  commute: { min: 1, max: 1.5, default: 1, step: 0.5 },
  tour: { min: 3, max: 6, default: 4, step: 1 },
  special: { min: 4, max: 8, default: 5, step: 1 },
};

export const DEFAULT_HOURS: Record<TripKind, number> = {
  commute: HOURS_RANGE.commute.default,
  tour: HOURS_RANGE.tour.default,
  special: HOURS_RANGE.special.default,
};

const KIND_MULT: Record<TripKind, number> = {
  commute: 1.06,
  tour: 1,
  special: 1.24,
};

const NOW_MULT = 1.12;

export type FareQuote = {
  hours: number;
  total: number;
  owner: number;
  captain: number;
  platform: number;
  marina: ReturnType<typeof marinaShares>;
  marketHourly: number;
  marketName: string;
};

export function defaultHoursFor(kind: TripKind, _yacht?: Yacht) {
  return HOURS_RANGE[kind].default;
}

export function clampHours(kind: TripKind, hours: number) {
  const { min, max, step, default: fallback } = HOURS_RANGE[kind];
  if (!Number.isFinite(hours)) return fallback;
  const snapped = Math.round(hours / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(2))));
}

export function nowStamp() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 25);
  const rounded = Math.ceil(d.getMinutes() / 5) * 5;
  d.setMinutes(rounded >= 60 ? 60 : rounded, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Fallback seed if a place has no market match. Classification still applies on top. */
export const BASE_HOURLY = 380;

const TRAIT_RATE = {
  luxurious: 1.55,
  fast: 1.18,
  small: 0.8,
} as const;

export function yachtClasses(yacht: Yacht) {
  return yacht.traits?.length ? yacht.traits : (["fast"] as const);
}

function classificationHourly(yacht: Yacht, market: number) {
  let hourly = market;
  for (const trait of yachtClasses(yacht)) {
    hourly *= TRAIT_RATE[trait];
  }
  const cap = Math.max(2, yacht.guests || 8);
  hourly *= 1 + (cap - 8) * 0.038;
  if (yacht.lengthFt > 0) {
    hourly *= 1 + (yacht.lengthFt - 42) * 0.0045;
  }
  return Math.max(150, hourly);
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

export function toCents(usd: number) {
  return Math.max(0, Math.round(usd * 100));
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

export function clampGratuityPct(pct: number) {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(GRATUITY_MAX_PCT, Math.max(0, Math.round(pct)));
}

export function gratuityAmount(total: number, pct: number) {
  return Math.round((total * clampGratuityPct(pct)) / 100);
}

export type ChargeBreakdown = {
  fare: number;
  gratuityPct: number;
  gratuity: number;
  total: number;
  owner: number;
  captain: number;
  captainTotal: number;
  platform: number;
  marina: ReturnType<typeof marinaShares>;
  fareCents: number;
  gratuityCents: number;
  totalCents: number;
  ownerCents: number;
  captainCents: number;
  captainTotalCents: number;
  platformCents: number;
  marinaOriginCents: number;
  marinaDestCents: number;
};

/** Fare split (100%) plus optional captain gratuity on top. */
export function settleCharge(
  quote: Pick<
    FareQuote,
    "total" | "owner" | "captain" | "platform" | "marina"
  >,
  gratuityPct: number,
): ChargeBreakdown {
  const pct = clampGratuityPct(gratuityPct);
  const gratuity = gratuityAmount(quote.total, pct);
  return {
    fare: quote.total,
    gratuityPct: pct,
    gratuity,
    total: quote.total + gratuity,
    owner: quote.owner,
    captain: quote.captain,
    captainTotal: quote.captain + gratuity,
    platform: quote.platform,
    marina: quote.marina,
    fareCents: toCents(quote.total),
    gratuityCents: toCents(gratuity),
    totalCents: toCents(quote.total + gratuity),
    ownerCents: toCents(quote.owner),
    captainCents: toCents(quote.captain),
    captainTotalCents: toCents(quote.captain + gratuity),
    platformCents: toCents(quote.platform),
    marinaOriginCents: toCents(quote.marina.origin),
    marinaDestCents: toCents(quote.marina.destination),
  };
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
    whenMode?: WhenMode;
  },
): FareQuote {
  const hours = clampHours(
    kind,
    options?.hours ?? defaultHoursFor(kind, yacht),
  );
  const guests = Math.max(1, options?.guests ?? 4);
  const market = tripMarketHourly(options?.origin, options?.destination);
  const hourly = classificationHourly(yacht, market);
  const raw =
    hourly *
    hours *
    KIND_MULT[kind] *
    guestMultiplier(yacht, guests) *
    dateMultiplier(options?.date) *
    (options?.whenMode === "now" ? NOW_MULT : 1);
  const floor = kind === "commute" ? 180 : 320;
  const total = Math.max(floor, Math.round(raw / 5) * 5);
  return {
    hours,
    total,
    marketHourly: Math.round(hourly),
    marketName: marketLabel(options?.origin, options?.destination),
    ...splitFare(total, options?.origin, options?.destination),
  };
}
