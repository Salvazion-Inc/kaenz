import {
  acceptanceAllowsCheckout,
  captainAutoAcceptEnabled,
  isCaptainRole,
  mapOfferRow,
  OFFER_ID,
  type StoredOffer,
} from "./captain-accept";
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

export async function readProfileRole(
  userId: string,
): Promise<{ ok: true; role: string } | { ok: false }> {
  const supabase = getSupabase();
  if (!supabase || !userId) return { ok: false };
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, role: String(data?.role || "") };
}

export async function userIsCaptain(userId: string) {
  const role = await readProfileRole(userId);
  if (!role.ok) return { ok: false as const, status: 503 as const };
  if (!isCaptainRole(role.role)) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
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

export async function acceptTripOffer(input: {
  id: string;
  captainId: string;
  yachtId: string;
}) {
  const existing = await loadOffer(input.id);
  if (!existing) return { error: "offer" as const, status: 404 as const };
  const yachtId = clip(input.yachtId, 80) || existing.yachtId;
  if (!yachtId) return { error: "yacht" as const, status: 400 as const };
  if (
    existing.status === "accepted" &&
    existing.acceptedBy &&
    existing.acceptedAt &&
    existing.yachtId
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
      yacht_id: yachtId,
    })
    .eq("id", existing.id)
    .eq("status", "offered")
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return { error: "offer" as const, status: 409 as const };
  const offer = mapOfferRow(data as Record<string, unknown>);
  if (!offer || offer.status !== "accepted" || !offer.acceptedBy || !offer.acceptedAt) {
    return { error: "offer" as const, status: 409 as const };
  }
  return { offer };
}

export async function declineTripOffer(id: string) {
  const existing = await loadOffer(id);
  if (!existing) return { error: "offer" as const, status: 404 as const };
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

export async function listVisibleOffers(userId: string, captain: boolean) {
  const supabase = getSupabase();
  if (!supabase) return [] as StoredOffer[];
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
    .filter((row) =>
      captain
        ? row.status === "offered" || row.acceptedBy === userId
        : row.userId === userId,
    );
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
