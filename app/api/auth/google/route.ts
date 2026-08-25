import { NextResponse } from "next/server";
import {
  createOauthStart,
  googleAuthUrl,
  googleCallbackUrl,
  oauthStateCookie,
  safeNext,
} from "@/lib/google-oauth";
import {
  applyCookies,
  createRouteSupabase,
  supabaseConfigured,
} from "@/lib/supabase-route";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const fail = new URL(`/login?error=google&next=${encodeURIComponent(next)}`, url.origin);

  if (supabaseConfigured()) {
    const pending: Parameters<typeof applyCookies>[1] = [];
    const supabase = createRouteSupabase(req, pending);
    if (supabase) {
      const redirectTo = `${googleCallbackUrl(req)}?next=${encodeURIComponent(next)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "online",
            prompt: "select_account",
          },
        },
      });
      if (!error && data.url) {
        return applyCookies(NextResponse.redirect(data.url), pending);
      }
    }
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(fail);
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
