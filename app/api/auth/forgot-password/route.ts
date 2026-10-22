import { NextResponse } from "next/server";
import { passwordResetMessage, passwordResetRedirect } from "@/lib/auth-link";
import { getAuthClient, requestOrigin } from "@/lib/email-verification";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Always the same success body. A missing account, a send failure, and an
 * unconfigured project look identical so the response cannot be used to
 * enumerate users.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`forgot:${ip}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(
    body && typeof body === "object" ? (body as { email?: unknown }).email : "",
  )
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const auth = getAuthClient();
  if (auth) {
    try {
      await auth.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetRedirect(requestOrigin(req)),
      });
    } catch {
      /* same response either way */
    }
  }

  return NextResponse.json({ ok: true, message: passwordResetMessage() });
}
