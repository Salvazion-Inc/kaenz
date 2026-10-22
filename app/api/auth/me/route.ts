import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/account-verification";

export async function GET(req: Request) {
  const session = await resolveRequestSession(req.headers.get("cookie"), req);
  if (!session.user) return NextResponse.json({ user: null, verified: false });
  const res = NextResponse.json({ user: session.user, verified: session.verified });
  if (session.setCookie) res.headers.append("Set-Cookie", session.setCookie);
  return res;
}
