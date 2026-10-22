import { NextResponse } from "next/server";
import {
  emailOtpType,
  verificationLinkExpired,
} from "@/lib/auth-link";
import { requestOrigin } from "@/lib/email-verification";
import { logFunnel } from "@/lib/funnel";
import { cookieValue, createSessionToken, sessionCookie } from "@/lib/session";
import { ONBOARDING_COOKIE, parseSignupPrefill } from "@/lib/signup-prefill";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";

export const runtime = "nodejs";

function redirectTo(origin: string, path: string) {
  return NextResponse.redirect(new URL(path, origin));
}

/**
 * Hash errors never reach the server. This page stays on the callback URL
 * long enough for the script to read location.hash.
 */
function hashSniffResponse() {
  const html = `<!doctype html>
<meta charset="utf-8">
<title>Check your email</title>
<p>Check your email</p>
<script>
  var hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  var query = new URLSearchParams(location.search || "");
  var code = hash.get("error_code") || query.get("error_code") || "";
  var error = (hash.get("error") || query.get("error") || "").toLowerCase();
  var expired = Boolean(code) || error === "access_denied" || error === "otp_expired" || error.indexOf("expired") !== -1;
  location.replace(expired ? "/check-email?expired=1" : "/login");
</script>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

/**
 * Supabase email confirmation lands here.
 * PKCE `code` uses exchangeCodeForSession (the verifier cookie is missing when
 * the link is opened in another browser). `token_hash` + `type` uses verifyOtp,
 * which does not need that cookie. Either path sets the Supabase cookies and
 * the Kaenz session, then opens /app. If the link confirmed the email but no
 * session can be stored, the browser goes to /login?verified=1.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = requestOrigin(req);
  if (verificationLinkExpired(url.searchParams)) {
    return redirectTo(origin, "/check-email?expired=1");
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = emailOtpType(url.searchParams.get("type"));
  const next = url.searchParams.get("next");
  if (!code && !(tokenHash && otpType)) return hashSniffResponse();

  const pending: PendingCookie[] = [];
  const supabase = createRouteSupabase(req, pending);
  let authUser: {
    id?: string;
    email?: string | null;
    user_metadata?: { full_name?: string; kaenz_role?: string } | null;
  } | null = null;

  if (supabase && tokenHash && otpType) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (!error && data.user?.id) authUser = data.user;
    } catch {
      authUser = null;
    }
  }
  if (supabase && code && !authUser) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user?.id) authUser = data.user;
    } catch {
      authUser = null;
    }
  }

  const email = authUser?.email?.trim().toLowerCase() || "";
  if (!authUser?.id || !email) {
    return redirectTo(origin, "/login?verified=1");
  }

  const name = String(authUser.user_metadata?.full_name || "").trim() || email;
  const session = await createSessionToken({ id: authUser.id, email, name });
  const metaRole = parseSignupPrefill({ role: authUser.user_metadata?.kaenz_role }).role;
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
  const recovery = otpType === "recovery" || next === "/reset-password";
  let nextPath = "/app";
  if (recovery) nextPath = "/reset-password";
  else if (role === "owner" || role === "captain") nextPath = "/app/yachts";
  if (!recovery) logFunnel("email_verified", role || undefined);

  const res = redirectTo(origin, nextPath);
  applyCookies(res, pending);
  res.headers.append("Set-Cookie", sessionCookie(session));
  return res;
}
