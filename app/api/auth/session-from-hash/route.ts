import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session";
import {
  applyCookies,
  createRouteSupabase,
  setKaenzSessionCookie,
  type PendingCookie,
} from "@/lib/supabase-route";

import { csrfOk, isRecoverySession } from "@/lib/session-hash";

export const runtime = "nodejs";

/**
 * Supabase recovery mail uses the implicit flow: tokens arrive in the URL
 * hash, which the server never sees. /auth/callback reads them in the browser
 * and posts them here. setSession validates them with Supabase before any
 * cookie is written. Recovery goes to /reset-password, anything else to /app.
 */
export async function POST(req: Request) {
  if (!csrfOk(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { access_token?: unknown; refresh_token?: unknown }
    | null;
  const access_token = String(body?.access_token || "");
  const refresh_token = String(body?.refresh_token || "");
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "tokens" }, { status: 400 });
  }
  const pending: PendingCookie[] = [];
  const supabase = createRouteSupabase(req, pending);
  if (!supabase) return NextResponse.json({ error: "config" }, { status: 503 });
  try {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    const email = data.user?.email?.trim().toLowerCase() || "";
    if (error || !data.user?.id || !email) {
      return NextResponse.json({ error: "session" }, { status: 400 });
    }
    const name = String(data.user.user_metadata?.full_name || "").trim() || email;
    const session = await createSessionToken({ id: data.user.id, email, name });
    const next = isRecoverySession(access_token, data.user.recovery_sent_at) ? "/reset-password" : "/app";
    const res = NextResponse.json({ ok: true, next });
    applyCookies(res, pending);
    setKaenzSessionCookie(res, session);
    return res;
  } catch {
    return NextResponse.json({ error: "session" }, { status: 400 });
  }
}
