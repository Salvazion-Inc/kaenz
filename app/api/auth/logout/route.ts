import { clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Native form POST. Clears the host-only cookie both with and without Secure
 * so a pre-hydration submit cannot leave the session in place, then redirects.
 */
export async function POST(req: Request) {
  const res = new Response(null, {
    status: 303,
    headers: { Location: new URL("/login", req.url).toString() },
  });
  res.headers.append("Set-Cookie", clearSessionCookie(false));
  res.headers.append("Set-Cookie", clearSessionCookie(true));
  return res;
}
