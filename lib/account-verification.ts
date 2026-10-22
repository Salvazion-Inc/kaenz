import type { SessionUser } from "./session";
import {
  cookieValue,
  hasSupabaseAuthCookie,
  readSession,
  SESSION_COOKIE,
} from "./session";
import { shouldClearDeviceSession, type AuthFailure } from "./stale-session";
import { getSupabase, getSupabaseAdmin } from "./supabase";
import { createRouteSupabase } from "./supabase-route";

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
  user_metadata?: { email_verified?: boolean; full_name?: string } | null;
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

/**
 * `email_confirmed_at` on the auth user is the flag. A session payload can omit
 * it; the admin auth row wins when it is confirmed. This does not read profiles.
 */
export function signalFromAuthUsers(
  sessionRow: AuthConfirmRow | null | undefined,
  adminRow: AuthConfirmRow | null | undefined,
): ConfirmationSignal {
  if (confirmationSignal(adminRow) === "confirmed") return "confirmed";
  if (confirmationSignal(sessionRow) === "confirmed") return "confirmed";
  if (adminRow) return confirmationSignal(adminRow);
  return confirmationSignal(sessionRow);
}

export function verifiedFromAuthUser(row: AuthConfirmRow | null | undefined) {
  return confirmationSignal(row) === "confirmed";
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

/** Refresh email and name on an existing profile. No new column, and no insert. */
export async function syncConfirmedProfile(user: AuthConfirmRow | null | undefined) {
  if (!verifiedFromAuthUser(user) || !user?.id) return;
  const db = getSupabase();
  if (!db) return;
  try {
    const existing = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existing.error || !existing.data) return;
    const email = String(user.email || "").trim().toLowerCase();
    const name = String(user.user_metadata?.full_name || "").trim();
    const patch: { email?: string; full_name?: string } = {};
    if (email) patch.email = email;
    if (name) patch.full_name = name;
    if (!Object.keys(patch).length) return;
    await db.from("profiles").update(patch).eq("id", user.id);
  } catch {
    /* profile table missing or paused */
  }
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
    { error: "unverified", message: "Verify your email" },
    { status: 403 },
  );
}

export type LiveAuthUser = AuthConfirmRow & {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; email_verified?: boolean } | null;
};

export type SessionDecision = {
  user: SessionUser | null;
  verified: boolean;
  signal: ConfirmationSignal;
  stale: boolean;
};

/**
 * A Kaenz cookie is not a session by itself when Supabase can be reached.
 * A live Supabase user wins. A presented sb-* cookie that Supabase rejects is
 * logged out. A confirmed account with no live Supabase session is logged out.
 * An unconfirmed account may keep the Kaenz cookie so the verify screen can
 * render (signup does not issue an sb session until the link is opened).
 * An unreachable Supabase project does not lock the platform.
 */
export function decideSession(input: {
  cookieUser: SessionUser | null;
  liveUser: SessionUser | null;
  configured: boolean;
  reachable: boolean;
  sbCookiesPresent: boolean;
  signal: ConfirmationSignal;
}): SessionDecision {
  if (input.liveUser) {
    return {
      user: input.liveUser,
      verified: signalAllowsUse(input.signal),
      signal: input.signal,
      stale: false,
    };
  }
  if (!input.cookieUser) {
    return { user: null, verified: false, signal: "unknown", stale: false };
  }
  if (!input.configured || !input.reachable) {
    return {
      user: input.cookieUser,
      verified: signalAllowsUse(input.signal),
      signal: input.signal,
      stale: false,
    };
  }
  if (input.sbCookiesPresent || input.signal === "confirmed") {
    return { user: null, verified: false, signal: input.signal, stale: false };
  }
  return {
    user: input.cookieUser,
    verified: signalAllowsUse(input.signal),
    signal: input.signal,
    stale: false,
  };
}

type LiveAuthResult = {
  configured: boolean;
  reachable: boolean;
  user: LiveAuthUser | null;
  error: AuthFailure | null;
};

function authFailure(error: unknown): AuthFailure | null {
  if (!error || typeof error !== "object") return null;
  const row = error as { message?: string; code?: string };
  return { message: row.message || "", code: row.code || "" };
}

async function readLiveSupabaseUser(req: Request): Promise<LiveAuthResult> {
  const pending: { name: string; value: string }[] = [];
  const supabase = createRouteSupabase(req, pending);
  if (!supabase) return { configured: false, reachable: false, user: null, error: null };
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user?.id) {
      return { configured: true, reachable: true, user: data.user, error: null };
    }
    const failure = authFailure(error);
    const message = String(failure?.message || "").toLowerCase();
    const status = (error as { status?: number } | null)?.status || 0;
    const network =
      status >= 500 ||
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("timeout");
    if (network) return { configured: true, reachable: false, user: null, error: failure };
    return { configured: true, reachable: true, user: null, error: failure };
  } catch (err) {
    return { configured: true, reachable: false, user: null, error: authFailure(err) };
  }
}

function sessionUserFromAuth(row: LiveAuthUser, cookieUser: SessionUser | null): SessionUser | null {
  const email = String(row.email || cookieUser?.email || "").trim().toLowerCase();
  if (!email) return cookieUser;
  const metaName = String(row.user_metadata?.full_name || "").trim();
  return {
    id: row.id,
    email,
    name: cookieUser?.name || metaName || email,
  };
}

/** Cookie plus a Supabase Auth check. Used by /app and /api/auth/me. */
export async function resolveRequestSession(
  cookieHeader: string | null | undefined,
  req?: Request,
): Promise<SessionDecision> {
  const cookieUser = await readSession(cookieValue(cookieHeader, SESSION_COOKIE));
  const headers = new Headers(req?.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const probe = new Request(req?.url || "https://kaenz.com/", { headers });
  const live = await readLiveSupabaseUser(probe);
  const sbCookiesPresent = hasSupabaseAuthCookie(cookieHeader);
  const liveUser = live.user ? sessionUserFromAuth(live.user, cookieUser) : null;

  let signal: ConfirmationSignal = "unknown";
  if (req && previewUnverifiedOverride(req)) signal = "unconfirmed";
  else if (live.user) {
    const identity = sessionUserFromAuth(live.user, cookieUser);
    const adminRow = identity ? await findAuthUser(identity).catch(() => null) : null;
    signal = signalFromAuthUsers(live.user, adminRow);
    if (signal === "confirmed") void syncConfirmedProfile(adminRow || live.user);
  } else if (cookieUser) signal = await accountSignal(cookieUser, req);

  const decision = decideSession({
    cookieUser,
    liveUser,
    configured: live.configured,
    reachable: live.reachable,
    sbCookiesPresent,
    signal,
  });
  return {
    ...decision,
    stale: shouldClearDeviceSession({
      reachable: live.reachable,
      live: Boolean(live.user),
      sbCookiesPresent,
      confirmed: signal === "confirmed",
      error: live.error,
    }),
  };
}

/**
 * Caller for every API route. Same decision as GET /api/auth/me: a live
 * Supabase user wins when the Kaenz cookie was signed with an older key.
 */
export async function readApiSession(req: Request): Promise<SessionUser | null> {
  const { user } = await resolveRequestSession(req.headers.get("cookie"), req);
  return user;
}

export async function requireVerifiedUser(
  req: Request,
): Promise<{ user: SessionUser } | { response: Response }> {
  const { user, signal } = await resolveRequestSession(req.headers.get("cookie"), req);
  const decision = accessDecision(user, signal);
  if (decision === "anonymous") {
    return { response: Response.json({ error: "auth" }, { status: 401 }) };
  }
  if (decision === "unverified") return { response: unverifiedResponse() };
  return { user: user as SessionUser };
}
