import { NextResponse } from "next/server";
import {
  createOauthStart,
  googleAuthUrl,
  googleCallbackUrl,
  googleConfigured,
  googleFailUrl,
  oauthStateCookie,
  parseAuthFrom,
  safeNext,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const from = parseAuthFrom(url.searchParams.get("from"));

  if (!googleConfigured()) {
    return NextResponse.redirect(googleFailUrl(req, { next, from, reason: "unconfigured" }));
  }

  const start = await createOauthStart(next, from);
  const dest = googleAuthUrl({
    nonce: start.nonce,
    challenge: start.challenge,
    callback: googleCallbackUrl(req),
  });
  const res = NextResponse.redirect(dest);
  res.headers.append("Set-Cookie", oauthStateCookie(start.token));
  return res;
}
