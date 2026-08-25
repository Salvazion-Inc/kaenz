import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureSupabaseUser(email: string, name: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const found = listed?.users?.find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
    );
    const id = found?.id
      ? found.id
      : (
          await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: name, provider: "google" },
          })
        ).data.user?.id;
    if (!id) return null;
    await admin.from("profiles").upsert({
      id,
      full_name: name,
      role: "client",
    });
    return { id, email, name };
  } catch {
    return null;
  }
}
