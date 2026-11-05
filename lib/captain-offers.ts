import {
  acceptanceAllowsCheckout,
  captainAutoAcceptEnabled,
  mapOfferRow,
  OFFER_ID,
  type StoredOffer,
} from "./captain-accept";
import {
  decideCaptainOfferAction,
  isEligibleCaptain,
  type AssignedYacht,
  type CaptainEligibility,
} from "./captain-eligibility";
import { getSupabase } from "./supabase";

const COLUMNS =
  "id, user_id, customer_name, yacht_id, origin_name, dest_name, guests, kind, hours, status, accepted_by, accepted_at";

function clip(value: unknown, max: number) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function finiteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function loadOffer(id: string): Promise<StoredOffer | null> {
  if (!OFFER_ID.test(id)) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trip_offers")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapOfferRow(data as Record<string, unknown>);
}

export type LoadedEligibility =
  | ({ ok: true } & CaptainEligibility)
  | { ok: false; status: 503 };

/** Server-side only. Does not read profiles.role. */
export async function loadCaptainEligibility(userId: string): Promise<LoadedEligibility> {
  const supabase = getSupabase();
  if (!supabase || !userId) return { ok: false, status: 503 };
  try {
    const profile = await supabase
      .from("profiles")
      .select("captain_verified")
      .eq("id", userId)
      .maybeSingle();
    const verified = !profile.error && profile.data?.captain_verified === true;
    const listings = await supabase
      .from("yacht_listings")
      .select("id, slug")
      .eq("captain_user_id", userId)
      .eq("status", "listed");
    const yachts: AssignedYacht[] =
      listings.error || !listings.data
        ? []
        : (listings.data as { id?: string; slug?: string }[])
            .map((row) => ({
              id: String(row.id || ""),
              slug: String(row.slug || ""),
            }))
            .filter((row) => row.id || row.slug);
    return { ok: true, verified, yachts };
  } catch {
    return { ok: false, status: 503 };
  }
}

export async function userIsCaptain(
  userId: string,
  load: (id: string) => Promise<LoadedEligibility> = loadCaptainEligibility,
) {
  const found = await load(userId);
  if (!found.ok) return { ok: false as const, status: found.status };
  if (!isEligibleCaptain(found)) return { ok: false as const, status: 403 as const };
  return { ok: true as const, verified: found.verified, yachts: found.yachts };
}

export async function createTripOffer(input: {
  userId: string;
  customerName: string;
  yachtId?: string;
  originName?: string;
  destName?: string;
  guests?: unknown;
  kind?: string;
  hours?: unknown;
}) {
  const supabase = getSupabase();
  if (!supabase || !input.userId) {
    return { error: "offer" as const, status: 503 as const };
  }
  const { data, error } = await supabase
    .from("trip_offers")
    .insert({
      user_id: input.userId,
      customer_name: clip(input.customerName, 120),
      yacht_id: clip(input.yachtId, 80),
      origin_name: clip(input.originName, 160),
      dest_name: clip(input.destName, 160),
      guests: finiteNumber(input.guests),
      kind: clip(input.kind, 32),
      hours: finiteNumber(input.hours),
      status: "offered",
      accepted_by: null,
      accepted_at: null,
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    return { error: "offer" as const, status: 503 as const };
  }
  return { id: String(data.id), status: "offered" as const };
}

async function eligibilityFor(
  userId: string,
  given?: CaptainEligibility,
): Promise<LoadedEligibility> {
  if (given) return { ok: true, ...given };
  return loadCaptainEligibility(userId);
}

export async function acceptTripOffer(input: {
  id: string;
  captainId: string;
  yachtId: string;
  load?: (id: string) => Promise<StoredOffer | null>;
  eligibility?: CaptainEligibility;
}) {
  const existing = await (input.load || loadOffer)(input.id);
  if (!existing) return { error: "offer" as const, status: 404 as const };
  const eligibility = await eligibilityFor(input.captainId, input.eligibility);
  if (!eligibility.ok) return { error: "offer" as const, status: 503 as const };
  const decision = decideCaptainOfferAction({
    captainId: input.captainId,
    customerId: existing.userId,
    yachtId: clip(input.yachtId, 80),
    offerYachtId: existing.yachtId,
    yachts: eligibility.yachts,
    kind: "accept",
  });
  if (!decision.ok) return { error: decision.error, status: decision.status };
  if (
    existing.status === "accepted" &&
    existing.acceptedBy === input.captainId &&
    existing.acceptedBy !== existing.userId &&
    existing.yachtId === decision.yachtId
  ) {
    return { offer: existing };
  }
  if (existing.status !== "offered") {
    return { error: "offer" as const, status: 409 as const };
  }
  const supabase = getSupabase();
  if (!supabase) return { error: "offer" as const, status: 503 as const };
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("trip_offers")
    .update({
      status: "accepted",
      accepted_by: input.captainId,
      accepted_at: acceptedAt,
      yacht_id: decision.yachtId,
    })
    .eq("id", existing.id)
    .eq("status", "offered")
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return { error: "offer" as const, status: 409 as const };
  const offer = mapOfferRow(data as Record<string, unknown>);
  if (
    !offer ||
    offer.status !== "accepted" ||
    !offer.acceptedBy ||
    offer.acceptedBy === offer.userId ||
    !offer.acceptedAt
  ) {
    return { error: "offer" as const, status: 409 as const };
  }
  return { offer };
}

export async function declineTripOffer(
  id: string,
  captainId: string,
  opts?: {
    load?: (id: string) => Promise<StoredOffer | null>;
    eligibility?: CaptainEligibility;
  },
) {
  const existing = await (opts?.load || loadOffer)(id);
  if (!existing) return { error: "offer" as const, status: 404 as const };
  const eligibility = await eligibilityFor(captainId, opts?.eligibility);
  if (!eligibility.ok) return { error: "offer" as const, status: 503 as const };
  const decision = decideCaptainOfferAction({
    captainId,
    customerId: existing.userId,
    yachtId: existing.yachtId,
    offerYachtId: existing.yachtId,
    yachts: eligibility.yachts,
    kind: "decline",
  });
  if (!decision.ok) return { error: decision.error, status: decision.status };
  if (existing.status === "declined") return { offer: existing };
  if (existing.status !== "offered") {
    return { error: "offer" as const, status: 409 as const };
  }
  const supabase = getSupabase();
  if (!supabase) return { error: "offer" as const, status: 503 as const };
  const { data, error } = await supabase
    .from("trip_offers")
    .update({ status: "declined", accepted_by: null, accepted_at: null })
    .eq("id", existing.id)
    .eq("status", "offered")
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return { error: "offer" as const, status: 409 as const };
  const offer = mapOfferRow(data as Record<string, unknown>);
  if (!offer) return { error: "offer" as const, status: 409 as const };
  return { offer };
}

export async function listVisibleOffers(userId: string, yachts: AssignedYacht[] | null) {
  const supabase = getSupabase();
  if (!supabase) return [] as StoredOffer[];
  const captain = yachts !== null;
  const query = supabase
    .from("trip_offers")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(40);
  const { data, error } = captain
    ? await query.in("status", ["offered", "accepted"])
    : await query.eq("user_id", userId);
  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .map((row) => mapOfferRow(row))
    .filter((row): row is StoredOffer => Boolean(row))
    .filter((row) => {
      if (!captain || !yachts) return row.userId === userId;
      if (row.acceptedBy === userId && row.acceptedBy !== row.userId) return true;
      return decideCaptainOfferAction({
        captainId: userId,
        customerId: row.userId,
        yachtId: row.yachtId,
        offerYachtId: row.yachtId,
        yachts,
        kind: "decline",
      }).ok;
    });
}

export async function checkoutCaptainBlock(input: {
  offerId: string;
  userId: string;
  yachtId: string;
  load?: (id: string) => Promise<StoredOffer | null>;
}) {
  if (captainAutoAcceptEnabled()) return null;
  const load = input.load || loadOffer;
  const row = await load(input.offerId.trim());
  if (!acceptanceAllowsCheckout(row, input.userId, input.yachtId)) {
    return { error: "captain_required" as const, status: 409 as const };
  }
  return null;
}
