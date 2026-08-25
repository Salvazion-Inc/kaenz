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

function secret() {
  return process.env.AUTH_SECRET || "kaenz-by-salvazion-inc-session-key";
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

export async function readSession(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  const raw = await readSignedValue(token);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionPayload;
    if (!data?.email || !data?.id || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { id: data.id, email: data.email, name: data.name || data.email };
  } catch {
    return null;
  }
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

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * DAY}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function accountsCookie(token: string) {
  return `${ACCOUNTS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * DAY}`;
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
