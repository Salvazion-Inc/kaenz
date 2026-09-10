import { placeById, type Place } from "./places";
import { estimateFare, type TripKind } from "./pricing";
import { yachtById, type Yacht } from "./yachts";

export const BOOKABLE_KINDS: TripKind[] = ["commute", "tour", "special"];

/**
 * seed-real bookable inventory.
 *
 * Evidence: origin South Florida catalog already published on kaenz.com/fleet
 * at named public marinas on the Miami Beach–FLL–Hollywood–Palm Beach corridor.
 * IDs are the stable catalog slugs — not the generated ~100 marketing cards.
 *
 * - galeon @ Miami Beach Marina (Miami Beach)
 * - tempest-42 @ Island Gardens Miami (Watson Island)
 * - savvy @ Las Olas Marina (Fort Lauderdale)
 * - pink-lady @ Hollywood Marina (Hollywood)
 * - amani @ Palm Beach Town Docks (Palm Beach)
 */
export const SEED_REAL_YACHT_IDS = [
  "galeon",
  "tempest-42",
  "savvy",
  "pink-lady",
  "amani",
] as const;

export const SEED_REAL_PLACE_IDS = [
  "miami-beach-marina",
  "island-gardens",
  "las-olas-marina",
  "hollywood-marina",
  "palm-beach-docks",
  "brickell",
] as const;

export const SEED_REAL_NOTE =
  "seed-real: origin FL catalog at public marinas (Miami Beach Marina, Island Gardens, Las Olas Marina, Hollywood Marina, Palm Beach Town Docks). Published on /fleet with stable slugs.";

export function decorateBookable(
  yacht: Yacht,
  source: "live" | "seed-real",
): Yacht {
  const origin = placeById(yacht.marinaId);
  const quote = estimateFare(yacht, "tour", {
    hours: 4,
    guests: Math.min(4, yacht.guests || 4),
    origin,
    destination: origin,
  });
  return {
    ...yacht,
    bookable: true,
    source,
    kinds: BOOKABLE_KINDS,
    priceFromUsd: quote.total,
    photos: yacht.photos?.length ? yacht.photos : [yacht.image].filter(Boolean),
  };
}

export function seedRealYachts(): Yacht[] {
  return SEED_REAL_YACHT_IDS.map((id) => yachtById(id))
    .filter((yacht): yacht is Yacht => Boolean(yacht))
    .map((yacht) => decorateBookable(yacht, "seed-real"));
}

export function seedRealPlaces(): Place[] {
  return SEED_REAL_PLACE_IDS.map((id) => placeById(id)).filter(
    (place): place is Place => Boolean(place),
  );
}

export function defaultDestinationId(yacht: Yacht, kind: TripKind) {
  if (kind !== "commute") return yacht.marinaId;
  if (
    yacht.marinaId === "miami-beach-marina" ||
    yacht.marinaId === "island-gardens"
  ) {
    return "brickell";
  }
  if (yacht.marinaId === "las-olas-marina") return "hollywood-marina";
  if (yacht.marinaId === "hollywood-marina") return "las-olas-marina";
  if (yacht.marinaId === "palm-beach-docks") return "las-olas-marina";
  return yacht.marinaId;
}

export function isSeedRealId(id: string) {
  return (SEED_REAL_YACHT_IDS as readonly string[]).includes(id);
}
