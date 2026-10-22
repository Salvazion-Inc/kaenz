import { NextResponse } from "next/server";
import { RESET_PASSWORD_ERROR } from "@/lib/auth-link";
import { createSessionToken, sessionCookie } from "@/lib/session";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";

export const runtime = "nodejs";

function rejected() {
  return NextResponse.json(
    { error: "session", message: RESET_PASSWORD_ERROR },
    { status: 400 },
  );
}

/** New password for the recovery session created by the email link. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(
    body && typeof body === "object" ? (body as { password?: unknown }).password : "",
  );
  if (password.length < 8) {
    return NextResponse.json({ error: "password" }, { status: 400 });
  }

  const pending: PendingCookie[] = [];
  const supabase = createRouteSupabase(req, pending);
  if (!supabase) return rejected();

  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    const email = data.user?.email?.trim().toLowerCase() || "";
    if (error || !data.user?.id || !email) return rejected();
    const name = String(data.user.user_metadata?.full_name || "").trim() || email;
    const session = await createSessionToken({ id: data.user.id, email, name });
    const res = NextResponse.json({ ok: true });
    applyCookies(res, pending);
    res.headers.append("Set-Cookie", sessionCookie(session));
    return res;
  } catch {
    return rejected();
  }
}
