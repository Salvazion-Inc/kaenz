import { NextResponse } from "next/server";
import { isAccountVerified } from "@/lib/account-verification";
import { SESSION_COOKIE, cookieValue, readSession } from "@/lib/session";

export async function GET(req: Request) {
  const user = await readSession(
    cookieValue(req.headers.get("cookie"), SESSION_COOKIE),
  );
  if (!user) return NextResponse.json({ user: null, verified: false });
  const verified = await isAccountVerified(user, req);
  return NextResponse.json({ user, verified });
}
