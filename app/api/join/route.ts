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
    role: String(body.role || "captain"),
    yacht_name: String(body.yacht_name || ""),
    uscg_license: String(body.uscg_license || ""),
    notes: String(body.notes || ""),
    status: "pending",
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("applications")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ id: data.id, stored: "supabase" });
  }

  return Response.json({ id: crypto.randomUUID(), stored: "local" });
}
