import type { SessionUser } from "./session";
import { getSupabaseAdmin } from "./supabase";

/**
 * Account verification is not a column on `profiles` and it is not stored in
 * the session cookie. The closest existing signal is Supabase Auth:
 * `email_confirmed_at` (also `confirmed_at` / `email_confirmed`, and Google
 * `user_metadata.email_verified`). Signup writes `email_confirm: true`, and
 * Google login already rejects `email_verified === false`, so a missing auth
 * row is not treated as unverified — there is nothing to read. An auth user
 * with no confirmation timestamp is unverified. No migration.
 */
export type AuthConfirmRow = {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  email_confirmed?: boolean | null;
  user_metadata?: { email_verified?: boolean } | null;
};

export type ConfirmationSignal = "confirmed" | "unconfirmed" | "unknown";

export function confirmationSignal(row: AuthConfirmRow | null | undefined): ConfirmationSignal {
  if (!row) return "unknown";
  if (row.email_confirmed_at || row.confirmed_at || row.email_confirmed === true) {
    return "confirmed";
  }
  if (row.user_metadata?.email_verified === true) return "confirmed";
  if (row.user_metadata?.email_verified === false) return "unconfirmed";
  return "unconfirmed";
}

/** Unknown means no auth user was found. Do not lock cookie-only accounts. */
export function signalAllowsSubmit(signal: ConfirmationSignal) {
  return signal !== "unconfirmed";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findAuthUser(user: SessionUser): Promise<AuthConfirmRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  if (UUID.test(user.id)) {
    const byId = await admin.auth.admin.getUserById(user.id);
    if (!byId.error && byId.data.user) return byId.data.user;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const endpoint = new URL("/auth/v1/admin/users", url);
  endpoint.searchParams.set("filter", user.email);
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { users?: AuthConfirmRow[] } | null;
  const email = user.email.toLowerCase();
  return (
    data?.users?.find((row) => String(row.email || "").toLowerCase() === email) || null
  );
}

/**
 * Preview-only switch for the unverified-email 403. Ignored unless
 * VERCEL_ENV is exactly "preview", so production never honors the header.
 */
export function previewUnverifiedOverride(req: { headers: Headers }) {
  if (process.env.VERCEL_ENV !== "preview") return false;
  return req.headers.get("x-kaenz-preview-unverified") === "1";
}

export async function isAccountVerified(user: SessionUser, req?: Request) {
  if (req && previewUnverifiedOverride(req)) return false;
  try {
    const row = await findAuthUser(user);
    return signalAllowsSubmit(confirmationSignal(row));
  } catch {
    return true;
  }
}

export function unverifiedResponse() {
  return Response.json({ error: "unverified" }, { status: 403 });
}
