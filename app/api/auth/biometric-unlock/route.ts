import { NextResponse } from "next/server";
import { createSessionToken, readSession, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const user = await readSession(token);
  if (!user) {
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }
  const session = await createSessionToken(user);
  const res = NextResponse.json({ user, token: session });
  res.headers.append("Set-Cookie", sessionCookie(session));
  return res;
}
