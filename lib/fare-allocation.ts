/**
 * Booking payout split after the fare is already in cents.
 *
 * A pickup or dropoff marina that is not a registered Kaenz partner — no
 * partner marina listing, or a listing with no Stripe account — does not get
 * a pending_payouts row. That 3.5% (7% when it is the same place) is added to
 * the yacht owner. A registered partner keeps their share; if their Stripe
 * account exists but is not active yet, the existing pending path still
 * applies (party "unknown" is the lookup-failed case and also stays pending).
 */

export type MarinaShareParty = "partner" | "unregistered" | "unknown";

export type BookingShareInput = {
  ownerCents: number;
  captainCents: number;
  marinaOriginCents: number;
  marinaDestCents: number;
  pickup: MarinaShareParty;
  dropoff: MarinaShareParty;
};

export type BookingShareAllocation = {
  ownerCents: number;
  captainCents: number;
  marinaPickupCents: number;
  marinaDropoffCents: number;
  /** Cents moved from an unregistered marina onto the yacht owner. */
  ownerFromMarinaCents: number;
};

export function allocateBookingShares(
  input: BookingShareInput,
): BookingShareAllocation {
  let ownerCents = input.ownerCents;
  let marinaPickupCents = input.marinaOriginCents;
  let marinaDropoffCents = input.marinaDestCents;
  let ownerFromMarinaCents = 0;

  if (input.pickup === "unregistered") {
    ownerCents += marinaPickupCents;
    ownerFromMarinaCents += marinaPickupCents;
    marinaPickupCents = 0;
  }
  if (input.dropoff === "unregistered") {
    ownerCents += marinaDropoffCents;
    ownerFromMarinaCents += marinaDropoffCents;
    marinaDropoffCents = 0;
  }

  return {
    ownerCents,
    captainCents: input.captainCents,
    marinaPickupCents,
    marinaDropoffCents,
    ownerFromMarinaCents,
  };
}

/**
 * Registered Kaenz partner: the marina listing resolved to a user and that
 * user has a Stripe Connect account. Missing either one is unregistered.
 * A failed read stays "unknown" so the share is not given to the owner.
 */
export function marinaShareParty(input: {
  listingUserId: string;
  stripeAccountId: string;
  lookupFailed?: boolean;
}): MarinaShareParty {
  if (input.lookupFailed) return "unknown";
  if (input.listingUserId.trim() && input.stripeAccountId.trim()) return "partner";
  return "unregistered";
}
