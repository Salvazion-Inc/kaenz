import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/email-verification";
import { logFunnel } from "@/lib/funnel";
import { cookieValue, createSessionToken, sessionCookie } from "@/lib/session";
import { ONBOARDING_COOKIE, parseSignupPrefill } from "@/lib/signup-prefill";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";

export const runtime = "nodejs";

/**
 * Supabase email confirmation lands here when Redirect URLs allow this host.
 * PKCE `code` becomes the Supabase session cookies plus the Kaenz session.
 * The email itself is confirmed by Supabase before this redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = requestOrigin(req);
  const pending: PendingCookie[] = [];
  const supabase = code ? createRouteSupabase(req, pending) : null;

  let session: string | null = null;
  let nextPath = "/app";
  if (supabase && code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      const email = data.user?.email?.trim().toLowerCase();
      if (!error && data.user?.id && email) {
        const name =
          String(data.user.user_metadata?.full_name || "").trim() || email;
        session = await createSessionToken({ id: data.user.id, email, name });
        const metaRole = parseSignupPrefill({
          role: data.user.user_metadata?.kaenz_role,
        }).role;
        const rawIntent = cookieValue(req.headers.get("cookie"), ONBOARDING_COOKIE);
        let cookieRole: "" | "owner" | "captain" | "marina" = "";
        if (rawIntent) {
          try {
            cookieRole = parseSignupPrefill(JSON.parse(rawIntent)).role;
          } catch {
            cookieRole = "";
          }
        }
        const role = metaRole || cookieRole;
        if (role === "owner" || role === "captain") nextPath = "/app/yachts";
        logFunnel("email_verified", role || undefined);
      }
    } catch {
      session = null;
    }
  }

  const res = NextResponse.redirect(new URL(nextPath, origin));
  applyCookies(res, pending);
  if (session) res.headers.append("Set-Cookie", sessionCookie(session));
  return res;
}
