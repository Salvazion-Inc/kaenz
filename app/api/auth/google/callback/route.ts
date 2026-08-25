import { NextResponse } from "next/server";
import {
  ACCOUNTS_COOKIE,
  accountsCookie,
  cookieValue,
  createSessionToken,
  readAccounts,
  sessionCookie,
  signAccounts,
  type AccountRecord,
} from "@/lib/session";
import {
  OAUTH_STATE_COOKIE,
  clearOauthStateCookie,
  exchangeGoogleCode,
  googleCallbackUrl,
  GOOGLE_MARKER,
  readOauthState,
  safeNext,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

function fail(req: Request, next: string) {
  const res = NextResponse.redirect(
    new URL(`/login?error=google&next=${encodeURIComponent(next)}`, req.url),
  );
  res.headers.append("Set-Cookie", clearOauthStateCookie());
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nonce = url.searchParams.get("state");
  const state = await readOauthState(
    cookieValue(req.headers.get("cookie"), OAUTH_STATE_COOKIE),
  );
  const next = safeNext(state?.next);
  if (!code || !nonce || !state || nonce !== state.nonce) {
    return fail(req, next);
  }

  let profile;
  try {
    profile = await exchangeGoogleCode({
      code,
      verifier: state.verifier,
      callback: googleCallbackUrl(req),
    });
  } catch {
    return fail(req, next);
  }
  if (!profile) return fail(req, next);

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  let account = users.find((u) => u.email === profile.email);
  if (!account) {
    account = {
      id: `google:${profile.sub}`,
      email: profile.email,
      name: profile.name,
      hash: GOOGLE_MARKER,
    } satisfies AccountRecord;
    users.push(account);
    if (users.length > 25) users.splice(0, users.length - 25);
  } else if (!account.name || account.name === account.email) {
    account.name = profile.name;
  }

  const session = await createSessionToken({
    id: account.id,
    email: account.email,
    name: account.name,
  });
  const vault = await signAccounts(users);
  const res = NextResponse.redirect(new URL(next, "https://kaenz.com"));
  const host = (req.headers.get("x-forwarded-host") || url.host).split(",")[0].trim();
  if (host.includes("localhost") || host.startsWith("127.")) {
    res.headers.set("Location", new URL(next, url.origin).toString());
  }
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", accountsCookie(vault));
  res.headers.append("Set-Cookie", clearOauthStateCookie());
  return res;
}
