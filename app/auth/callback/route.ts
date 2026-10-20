import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/email-verification";
import { createSessionToken, sessionCookie } from "@/lib/session";
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
  if (supabase && code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      const email = data.user?.email?.trim().toLowerCase();
      if (!error && data.user?.id && email) {
        const name =
          String(data.user.user_metadata?.full_name || "").trim() || email;
        session = await createSessionToken({ id: data.user.id, email, name });
      }
    } catch {
      session = null;
    }
  }

  const res = NextResponse.redirect(new URL("/app", origin));
  applyCookies(res, pending);
  if (session) res.headers.append("Set-Cookie", sessionCookie(session));
  return res;
}
