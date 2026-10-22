import { parseLocale, type Locale } from "./locale";

export const SESSION_COOKIE = "kaenz_session";
export const ACCOUNTS_COOKIE = "kaenz_accounts";
const DAY = 60 * 60 * 24;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type AccountRecord = SessionUser & {
  hash: string;
};

type SessionPayload = SessionUser & { exp: number };

let devSecret = "";

/**
 * Production must set AUTH_SECRET. Development and tests use a process-local
 * random value so a public string is never the signing key.
 */
export function resolveAuthSecret(
  env: { AUTH_SECRET?: string; NODE_ENV?: string },
  devSecretValue: string,
) {
  const configured = env.AUTH_SECRET?.trim() || "";
  if (configured) return configured;
  if (env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return devSecretValue;
}

/** Secure only on production HTTPS. Tests and local http stay non-Secure. */
export function cookieIsSecure(env: { NODE_ENV?: string } = process.env) {
  return env.NODE_ENV === "production";
}

function secret() {
  if (!devSecret) {
    devSecret = bytesToB64Url(crypto.getRandomValues(new Uint8Array(32)));
  }
  return resolveAuthSecret(process.env, devSecret);
}

function bytesToB64Url(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlToBytes(value: string) {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToB64Url(new Uint8Array(sig));
}

export async function signValue(value: string) {
  const sig = await hmac(value);
  return `${bytesToB64Url(new TextEncoder().encode(value))}.${sig}`;
}

export async function readSignedValue(token: string | undefined | null) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let raw: string;
  try {
    raw = new TextDecoder().decode(b64UrlToBytes(body));
  } catch {
    return null;
  }
  const expected = await hmac(raw);
  if (expected.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i += 1) {
    ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return ok === 0 ? raw : null;
}

export async function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + 30 * DAY,
  };
  return signValue(JSON.stringify(payload));
}

export type KaenzCookieReason = "no_cookie" | "bad_sig" | "expired";

/** Why a kaenz_session value cannot be trusted. Never includes the token. */
export async function inspectSession(
  token: string | undefined | null,
): Promise<{ user: SessionUser; reason: null } | { user: null; reason: KaenzCookieReason }> {
  if (!token) return { user: null, reason: "no_cookie" };
  const raw = await readSignedValue(token);
  if (!raw) return { user: null, reason: "bad_sig" };
  try {
    const data = JSON.parse(raw) as SessionPayload;
    if (!data?.email || !data?.id) return { user: null, reason: "bad_sig" };
    if (data.exp < Math.floor(Date.now() / 1000)) return { user: null, reason: "expired" };
    return {
      user: { id: data.id, email: data.email, name: data.name || data.email },
      reason: null,
    };
  } catch {
    return { user: null, reason: "bad_sig" };
  }
}

export async function readSession(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  const inspected = await inspectSession(token);
  return inspected.user;
}

export async function readAccounts(
  token: string | undefined | null,
): Promise<AccountRecord[]> {
  const raw = await readSignedValue(token);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { users?: AccountRecord[] };
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

export async function signAccounts(users: AccountRecord[]) {
  return signValue(JSON.stringify({ users }));
}

function secureSuffix() {
  return cookieIsSecure() ? "; Secure" : "";
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * DAY}${secureSuffix()}`;
}

export function clearSessionCookie() {
  return expireCookie(SESSION_COOKIE, false);
}

/** Auth cookies this app sets. Profile, trip, and locale cookies are not sessions. */
export const KAEZ_AUTH_COOKIES = [SESSION_COOKIE, ACCOUNTS_COOKIE, "kaenz_oauth"] as const;

export function sessionCookieNames(cookieHeader: string | null | undefined) {
  const names = new Set<string>(KAEZ_AUTH_COOKIES);
  if (!cookieHeader) return [...names];
  for (const part of cookieHeader.split(";")) {
    const name = part.trim().split("=")[0]?.trim();
    if (name?.startsWith("sb-")) names.add(name);
  }
  return [...names];
}

export function hasSupabaseAuthCookie(cookieHeader: string | null | undefined) {
  return sessionCookieNames(cookieHeader).some(
    (name) => name.startsWith("sb-") && !name.includes("code-verifier"),
  );
}

/** Drop a previous account's Supabase session. Leave PKCE verifiers for the signup in progress. */
export function clearStaleSupabaseSessionHeaders(cookieHeader: string | null | undefined) {
  const headers: string[] = [];
  if (!cookieHeader) return headers;
  for (const part of cookieHeader.split(";")) {
    const name = part.trim().split("=")[0]?.trim();
    if (!name?.startsWith("sb-") || name.includes("code-verifier")) continue;
    headers.push(expireCookie(name, false));
    headers.push(expireCookie(name, true));
  }
  return headers;
}

/**
 * Expire one cookie twice: with and without Secure. Host-only, Path=/, no Domain,
 * matching how Kaenz and Supabase SSR set these cookies. A Secure cookie set on
 * HTTPS is not deleted by a non-Secure Set-Cookie.
 */
export function clearSessionCookieHeaders(cookieHeader: string | null | undefined) {
  const headers: string[] = [];
  for (const name of sessionCookieNames(cookieHeader)) {
    headers.push(expireCookie(name, false));
    headers.push(expireCookie(name, true));
  }
  return headers;
}

function expireCookie(name: string, secure: boolean) {
  const base = `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  return secure ? `${base}; Secure` : base;
}

export function accountsCookie(token: string) {
  return `${ACCOUNTS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * DAY}${secureSuffix()}`;
}

export function cookieValue(header: string | null | undefined, name: string) {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function localeFromRequest(value: string | undefined | null): Locale {
  return parseLocale(value);
}
