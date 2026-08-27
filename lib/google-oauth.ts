import { createHash, randomBytes } from "crypto";
import { signValue, readSignedValue } from "./session";

export const OAUTH_STATE_COOKIE = "kaenz_oauth";
export const GOOGLE_MARKER = "oauth:google";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleProfile = {
  email: string;
  name: string;
  sub: string;
};

export type AuthFrom = "login" | "signup";
export type GoogleFailReason = "unconfigured" | "denied" | "failed";

type OauthState = {
  nonce: string;
  next: string;
  verifier: string;
  from: AuthFrom;
};

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/app";
  }
  return value;
}

export function parseAuthFrom(value: string | null | undefined): AuthFrom {
  return value === "signup" ? "signup" : "login";
}

export function googleReasonFromSearch(sp: {
  auth?: string;
  reason?: string;
  error?: string;
}) {
  if (sp.auth === "google" || sp.error === "google") return sp.reason || "failed";
  return undefined;
}

export function publicOrigin(req: Request) {
  const host = (req.headers.get("x-forwarded-host") || new URL(req.url).host)
    .split(",")[0]
    .trim();
  if (host.includes("localhost") || host.startsWith("127.")) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`;
  }
  return "https://kaenz.com";
}

export function googleCallbackUrl(req: Request) {
  return `${publicOrigin(req)}/api/auth/google/callback`;
}

export function googleFailUrl(
  req: Request,
  opts: { next: string; from: AuthFrom; reason: GoogleFailReason },
) {
  const path = opts.from === "signup" ? "/signup" : "/login";
  const url = new URL(path, publicOrigin(req));
  url.searchParams.set("auth", "google");
  url.searchParams.set("reason", opts.reason);
  url.searchParams.set("next", safeNext(opts.next));
  return url;
}

function b64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createOauthStart(next: string, from: AuthFrom) {
  const nonce = b64Url(randomBytes(16));
  const verifier = b64Url(randomBytes(32));
  const challenge = b64Url(createHash("sha256").update(verifier).digest());
  const state: OauthState = { nonce, next: safeNext(next), verifier, from };
  const token = await signValue(JSON.stringify(state));
  return { token, nonce, challenge };
}

export async function readOauthState(token: string | undefined | null) {
  const raw = await readSignedValue(token);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as OauthState;
    if (!data?.nonce || !data?.verifier || !data?.next) return null;
    return {
      nonce: data.nonce,
      next: data.next,
      verifier: data.verifier,
      from: parseAuthFrom(data.from),
    };
  } catch {
    return null;
  }
}

export function googleAuthUrl(opts: {
  nonce: string;
  challenge: string;
  callback: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.callback,
    response_type: "code",
    scope: "openid email profile",
    state: opts.nonce,
    nonce: opts.nonce,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  });
  return `${AUTH}?${params.toString()}`;
}

export function oauthStateCookie(token: string) {
  return `${OAUTH_STATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
}

export function clearOauthStateCookie() {
  return `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function exchangeGoogleCode(opts: {
  code: string;
  verifier: string;
  callback: string;
}): Promise<{ profile: GoogleProfile; idToken?: string; accessToken: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const body = new URLSearchParams({
    code: opts.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: opts.callback,
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  });
  const tokenRes = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return null;
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };
  if (!tokens.access_token) return null;
  const infoRes = await fetch(USERINFO, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    sub?: string;
  };
  const email = String(info.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || info.email_verified === false) return null;
  return {
    profile: {
      email,
      name: String(info.name || info.given_name || email),
      sub: String(info.sub || email),
    },
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
  };
}
