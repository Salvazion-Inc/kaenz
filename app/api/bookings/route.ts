import { requireVerifiedUser } from "@/lib/account-verification";
import { parseLocale } from "@/lib/locale";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const gate = await requireVerifiedUser(req);
  if ("response" in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return gate.seal(Response.json({ error: "fields" }, { status: 400 }));
  }
  const input = body as Record<string, unknown>;
  const full_name = String(input.full_name || "").trim();
  const email = String(input.email || "").trim();
  if (!full_name || !email) {
    return gate.seal(Response.json({ error: "fields" }, { status: 400 }));
  }

  const user = gate.user;

  const row = {
    full_name,
    email,
    phone: String(input.phone || ""),
    yacht_slug: String(input.yacht_slug || ""),
    origin: String(input.origin || ""),
    destination: String(input.destination || ""),
    trip_date: input.trip_date ? String(input.trip_date) : null,
    trip_time: String(input.trip_time || ""),
    guests: Number(input.guests) || 1,
    notes: String(input.notes || ""),
    locale: parseLocale(input.locale),
    status: "requested",
    amount: null,
    payment_method: String(input.payment_method || ""),
    trip_kind: String(input.trip_kind || ""),
    user_id: user?.id || "",
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      return gate.seal(Response.json({ error: "save" }, { status: 500 }));
    }
    return gate.seal(Response.json({ id: data.id, stored: "supabase" }));
  }

  const id = crypto.randomUUID();
  return gate.seal(Response.json({ id, stored: "local", booking: row }));
}
