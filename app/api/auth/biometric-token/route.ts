import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/account-verification";
import { SESSION_COOKIE, cookieValue, createSessionToken, inspectSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireSessionUser(req);
  if ("response" in gate) return gate.response;
  const current = cookieValue(req.headers.get("cookie"), SESSION_COOKIE);
  const inspected = await inspectSession(current);
  const token = gate.issuedToken || (inspected.user ? current : null) || (await createSessionToken(gate.user));
  return gate.seal(NextResponse.json({ token, user: gate.user }));
}
