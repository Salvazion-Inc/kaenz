import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieValue, readSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = cookieValue(req.headers.get("cookie"), SESSION_COOKIE);
  const user = await readSession(token);
  if (!user || !token) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  return NextResponse.json({ token, user });
}
