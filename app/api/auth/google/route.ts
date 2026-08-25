import { NextResponse } from "next/server";
import {
  createOauthStart,
  googleAuthUrl,
  googleCallbackUrl,
  googleConfigured,
  oauthStateCookie,
  safeNext,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`/login?error=google&next=${encodeURIComponent(next)}`, url.origin));
  }
  const start = await createOauthStart(next);
  const dest = googleAuthUrl({
    nonce: start.nonce,
    challenge: start.challenge,
    callback: googleCallbackUrl(req),
  });
  const res = NextResponse.redirect(dest);
  res.headers.append("Set-Cookie", oauthStateCookie(start.token));
  return res;
}
