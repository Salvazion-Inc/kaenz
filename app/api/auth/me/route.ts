import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieValue, readSession } from "@/lib/session";

export async function GET(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  return NextResponse.json({ user });
}
