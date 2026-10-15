import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

/** Clears the session on the navigation response so the first click cannot race the cookie. */
export async function POST(req: Request) {
  const secure = new URL(req.url).protocol === "https:";
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    secure,
  });
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.headers.append("Set-Cookie", clearSessionCookie(false));
  res.headers.append("Set-Cookie", clearSessionCookie(true));
  return res;
}
