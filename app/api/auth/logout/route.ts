import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/email-verification";
import { clearSessionCookieHeaders } from "@/lib/session";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const pending: PendingCookie[] = [];
  const supabase = createRouteSupabase(req, pending);
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      /* Cookie clears below still end the Kaenz session. */
    }
  }

  const res = NextResponse.redirect(new URL("/login", requestOrigin(req)), 303);
  applyCookies(res, pending);
  for (const header of clearSessionCookieHeaders(req.headers.get("cookie"))) {
    res.headers.append("Set-Cookie", header);
  }
  return res;
}
