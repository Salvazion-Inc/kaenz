import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/account-verification";
import {
  clearSessionCookieHeaders,
  createSessionToken,
  readSession,
  SESSION_COOKIE,
  sessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const vaultUser = await readSession(token);
  if (!vaultUser) {
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }
  const current = req.headers.get("cookie") || "";
  const cookie = current.includes(`${SESSION_COOKIE}=`)
    ? current
    : `${current ? `${current}; ` : ""}${SESSION_COOKIE}=${encodeURIComponent(token)}`;
  const probe = new Request(req.url, { headers: { cookie } });
  const decision = await resolveRequestSession(cookie, probe);
  if (decision.stale || !decision.user) {
    const res = NextResponse.json(
      { error: "expired", stale: Boolean(decision.stale) },
      { status: 401 },
    );
    if (decision.stale) {
      for (const header of clearSessionCookieHeaders(cookie)) {
        res.headers.append("Set-Cookie", header);
      }
    }
    return res;
  }
  const session = await createSessionToken(decision.user);
  const res = NextResponse.json({ user: decision.user, token: session });
  res.headers.append("Set-Cookie", sessionCookie(session));
  return res;
}
