import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(["owner", "captain", "both"]);
const BURST_MS = 60 * 1000;

function joinHoneypotFilled(body: unknown) {
  if (!body || typeof body !== "object") return false;
  return String((body as { company_website?: unknown }).company_website || "").trim().length > 0;
}

function tooMany(retryAfterSec: number) {
  return Response.json(
    { error: "rate" },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`join:${ip}`, 8, 10 * 60 * 1000);
  if (!limited.ok) return tooMany(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  const full_name = String(
    (body as { full_name?: string }).full_name || "",
  ).trim();
  const email = String((body as { email?: string }).email || "")
    .trim()
    .toLowerCase();
  if (joinHoneypotFilled(body)) {
    const trap = rateLimit(`join-burst:${ip}`, 1, BURST_MS);
    if (!trap.ok) return tooMany(trap.retryAfterSec);
    return Response.json({ ok: true, stored: "ignored" });
  }
  if (full_name.length < 2 || !EMAIL.test(email)) {
    return Response.json({ error: "fields" }, { status: 400 });
  }
  const burstIp = rateLimit(`join-burst:${ip}`, 1, BURST_MS);
  const burstEmail = rateLimit(`join-email:${email}`, 1, BURST_MS);
  if (!burstIp.ok || !burstEmail.ok) {
    return tooMany(Math.max(burstIp.retryAfterSec, burstEmail.retryAfterSec));
  }

  const roleRaw = String((body as { role?: string }).role || "captain");
  const row = {
    full_name,
    email,
    phone: String((body as { phone?: string }).phone || "").slice(0, 40),
    role: ROLES.has(roleRaw) ? roleRaw : "captain",
    yacht_name: String((body as { yacht_name?: string }).yacht_name || "").slice(
      0,
      80,
    ),
    uscg_license: String(
      (body as { uscg_license?: string }).uscg_license || "",
    ).slice(0, 80),
    notes: String((body as { notes?: string }).notes || "").slice(0, 500),
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
      return Response.json({ error: "save" }, { status: 500 });
    }
    return Response.json({ id: data.id, stored: "supabase" });
  }

  return Response.json({ id: crypto.randomUUID(), stored: "local" });
}
