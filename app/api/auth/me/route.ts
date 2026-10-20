import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/account-verification";

export async function GET(req: Request) {
  const { user, verified } = await resolveRequestSession(req.headers.get("cookie"), req);
  if (!user) return NextResponse.json({ user: null, verified: false });
  return NextResponse.json({ user, verified });
}
