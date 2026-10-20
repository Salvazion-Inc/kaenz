import type { SessionUser } from "./session";
import { cookieValue, readSession, SESSION_COOKIE } from "./session";
import { getSupabaseAdmin } from "./supabase";

/**
 * Verification is not a column on `profiles`. The signal is Supabase Auth
 * `email_confirmed_at` (also `confirmed_at` / `email_confirmed`, and Google
 * `user_metadata.email_verified`). A missing auth row is unknown, not a
 * failed check, so a Supabase outage does not lock the platform. An auth
 * user with no confirmation timestamp is unverified. No migration.
 */
export type AuthConfirmRow = {
  id?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  email_confirmed?: boolean | null;
  user_metadata?: { email_verified?: boolean } | null;
};

export type ConfirmationSignal = "confirmed" | "unconfirmed" | "unknown";

export type AccessDecision = "anonymous" | "unverified" | "allowed";

export function confirmationSignal(
  row: AuthConfirmRow | null | undefined,
): ConfirmationSignal {
  if (!row) return "unknown";
  if (row.email_confirmed_at || row.confirmed_at || row.email_confirmed === true) {
    return "confirmed";
  }
  if (row.user_metadata?.email_verified === true) return "confirmed";
  if (row.user_metadata?.email_verified === false) return "unconfirmed";
  return "unconfirmed";
}

/** Unknown means the auth row could not be read. Do not treat that as unverified. */
export function signalAllowsUse(signal: ConfirmationSignal) {
  return signal !== "unconfirmed";
}

/** No session, unverified session, or a session allowed to book and use the app. */
export function accessDecision(
  user: SessionUser | null,
  signal: ConfirmationSignal,
): AccessDecision {
  if (!user) return "anonymous";
  if (!signalAllowsUse(signal)) return "unverified";
  return "allowed";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findAuthUser(user: SessionUser): Promise<AuthConfirmRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  if (UUID.test(user.id)) {
    const byId = await admin.auth.admin.getUserById(user.id);
    if (!byId.error && byId.data.user) return byId.data.user;
  }
  return findAuthUserByEmail(user.email);
}

export async function findAuthUserByEmail(email: string): Promise<AuthConfirmRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !email) return null;
  const endpoint = new URL("/auth/v1/admin/users", url);
  endpoint.searchParams.set("filter", email);
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { users?: AuthConfirmRow[] } | null;
  const wanted = email.toLowerCase();
  return (
    data?.users?.find((row) => String(row.email || "").toLowerCase() === wanted) || null
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

export async function accountSignal(user: SessionUser, req?: Request): Promise<ConfirmationSignal> {
  if (req && previewUnverifiedOverride(req)) return "unconfirmed";
  try {
    const row = await findAuthUser(user);
    return confirmationSignal(row);
  } catch {
    return "unknown";
  }
}

export async function isAccountVerified(user: SessionUser, req?: Request) {
  return signalAllowsUse(await accountSignal(user, req));
}

export function unverifiedResponse() {
  return Response.json(
    { error: "unverified", message: "Verifica tu correo" },
    { status: 403 },
  );
}

export async function requireVerifiedUser(
  req: Request,
): Promise<{ user: SessionUser } | { response: Response }> {
  const user = await readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
  const decision = accessDecision(
    user,
    user ? await accountSignal(user, req) : "unknown",
  );
  if (decision === "anonymous") {
    return { response: Response.json({ error: "auth" }, { status: 401 }) };
  }
  if (decision === "unverified") return { response: unverifiedResponse() };
  return { user: user as SessionUser };
}
