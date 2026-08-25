import { parseLocale } from "@/lib/locale";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const full_name = String(body.full_name || "").trim();
  const email = String(body.email || "").trim();
  if (!full_name || !email) {
    return Response.json({ error: "Missing name or email" }, { status: 400 });
  }

  const row = {
    full_name,
    email,
    phone: String(body.phone || ""),
    yacht_slug: String(body.yacht_slug || ""),
    origin: String(body.origin || ""),
    destination: String(body.destination || ""),
    trip_date: body.trip_date || null,
    trip_time: String(body.trip_time || ""),
    guests: Number(body.guests) || 1,
    notes: String(body.notes || ""),
    locale: parseLocale(body.locale),
    status: String(body.status || "requested"),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ id: data.id, stored: "supabase" });
  }

  const id = crypto.randomUUID();
  return Response.json({ id, stored: "local", booking: row });
}
