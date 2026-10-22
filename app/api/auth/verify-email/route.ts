import { emailConfirmRedirect, resendSignupVerification } from "@/lib/email-verification";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cookieValue, readSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const limited = rateLimit(`verify-email:${clientIp(req)}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return Response.json(
      { error: "rate" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const session = await readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
  const email = String(session?.email || body.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return Response.json(
      {
        error: "email",
        message: "Add the email address to resend the confirmation.",
      },
      { status: 400 },
    );
  }

  const result = await resendSignupVerification(email, emailConfirmRedirect(req));
  if (result === "unconfigured") {
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }
  return Response.json({ ok: true });
}
