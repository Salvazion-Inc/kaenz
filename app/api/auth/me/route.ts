import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/account-verification";
import { clearSessionCookieHeaders } from "@/lib/session";

export async function GET(req: Request) {
  const { user, verified, stale } = await resolveRequestSession(req.headers.get("cookie"), req);
  if (!user) {
    const res = NextResponse.json({ user: null, verified: false, stale: Boolean(stale) });
    if (stale) {
      for (const header of clearSessionCookieHeaders(req.headers.get("cookie"))) {
        res.headers.append("Set-Cookie", header);
      }
    }
    return res;
  }
  return NextResponse.json({ user, verified, stale: false });
}
