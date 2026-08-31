import { getSupabase } from "./supabase";
import type { ChargeBreakdown } from "./pricing";

export type BookingRecord = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  yacht_slug?: string;
  origin?: string;
  destination?: string;
  trip_date?: string | null;
  trip_time?: string;
  guests?: number;
  notes?: string;
  locale?: string;
  status?: string;
  amount?: number | null;
  payment_method?: string;
  trip_kind?: string;
  user_id?: string;
  fare_amount?: number;
  gratuity_pct?: number;
  gratuity_amount?: number;
  share_owner?: number;
  share_captain?: number;
  share_platform?: number;
  share_marina_pickup?: number;
  share_marina_dropoff?: number;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  transfer_group?: string;
  payouts?: unknown;
};

const EXTRA = [
  "fare_amount",
  "gratuity_pct",
  "gratuity_amount",
  "share_owner",
  "share_captain",
  "share_platform",
  "share_marina_pickup",
  "share_marina_dropoff",
  "stripe_session_id",
  "stripe_payment_intent",
  "transfer_group",
  "payouts",
] as const;

function withoutExtra(row: Partial<BookingRecord>) {
  const next = { ...row } as Record<string, unknown>;
  for (const key of EXTRA) delete next[key];
  return next;
}

export function bookingFromCharge(
  charge: ChargeBreakdown,
  extra: Partial<BookingRecord>,
): BookingRecord {
  return {
    ...extra,
    amount: charge.total,
    fare_amount: charge.fare,
    gratuity_pct: charge.gratuityPct,
    gratuity_amount: charge.gratuity,
    share_owner: charge.owner,
    share_captain: charge.captainTotal,
    share_platform: charge.platform,
    share_marina_pickup: charge.marina.origin,
    share_marina_dropoff: charge.marina.destination,
    payment_method: extra.payment_method || "stripe",
  };
}

export async function insertBooking(row: BookingRecord) {
  const supabase = getSupabase();
  const fallback = row.id || crypto.randomUUID();
  if (!supabase) {
    return { id: fallback, stored: "local" as const };
  }
  try {
    const full = await supabase.from("bookings").insert(row).select("id").single();
    if (!full.error && full.data?.id) {
      return { id: String(full.data.id), stored: "supabase" as const };
    }
    const basic = await supabase
      .from("bookings")
      .insert(withoutExtra(row))
      .select("id")
      .single();
    if (!basic.error && basic.data?.id) {
      return { id: String(basic.data.id), stored: "supabase" as const };
    }
  } catch {
    /* persist locally; checkout still proceeds */
  }
  return { id: fallback, stored: "local" as const };
}

export async function updateBooking(id: string, patch: Partial<BookingRecord>) {
  const supabase = getSupabase();
  if (!supabase) return { stored: "local" as const };
  try {
    const full = await supabase.from("bookings").update(patch).eq("id", id);
    if (!full.error) return { stored: "supabase" as const };
    await supabase.from("bookings").update(withoutExtra(patch)).eq("id", id);
  } catch {
    /* ignore missing split columns until schema is applied */
  }
  return { stored: "local" as const };
}

export async function findBookingBySession(sessionId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id, status, stripe_session_id, stripe_payment_intent, amount")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data;
}
