import type { SessionUser } from "./session";
import {
  cookieValue,
  hasSupabaseAuthCookie,
  readSession,
  SESSION_COOKIE,
} from "./session";
import { getSupabaseAdmin } from "./supabase";
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
    };
  }
  if (!input.cookieUser) {
    return { user: null, verified: false, signal: "unknown" };
  }
  if (!input.configured || !input.reachable) {
    return {
      user: input.cookieUser,
      verified: signalAllowsUse(input.signal),
      signal: input.signal,
    };
  }
  if (input.sbCookiesPresent || input.signal === "confirmed") {
    return { user: null, verified: false, signal: input.signal };
  }
  return {
    user: input.cookieUser,
    verified: signalAllowsUse(input.signal),
    signal: input.signal,
  };
}

type LiveAuthResult = {
  configured: boolean;
  reachable: boolean;
  user: LiveAuthUser | null;
};

async function readLiveSupabaseUser(req: Request): Promise<LiveAuthResult> {
  const pending: { name: string; value: string }[] = [];
  const supabase = createRouteSupabase(req, pending);
  if (!supabase) return { configured: false, reachable: false, user: null };
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user?.id) {
      return { configured: true, reachable: true, user: data.user };
    }
    const message = String(error?.message || "").toLowerCase();
    const status = (error as { status?: number } | null)?.status || 0;
    const network =
      status >= 500 ||
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("timeout");
    if (network) return { configured: true, reachable: false, user: null };
    return { configured: true, reachable: true, user: null };
  } catch {
    return { configured: true, reachable: false, user: null };
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
  else if (live.user) signal = confirmationSignal(live.user);
  else if (cookieUser) signal = await accountSignal(cookieUser, req);

  return decideSession({
    cookieUser,
    liveUser,
    configured: live.configured,
    reachable: live.reachable,
    sbCookiesPresent,
    signal,
  });
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
