import { NextResponse } from "next/server";
import { signCheckEmail } from "@/lib/check-email";
import { emailConfirmRedirect, registerUnconfirmedUser } from "@/lib/email-verification";
import { logFunnel } from "@/lib/funnel";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { onboardingCookie, parseSignupPrefill } from "@/lib/signup-prefill";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";
import { hashPassword } from "@/lib/passwords";
import {
  ACCOUNTS_COOKIE,
  accountsCookie,
  cookieValue,
  createSessionToken,
  readAccounts,
  clearStaleSupabaseSessionHeaders,
  sessionCookie,
  signAccounts,
  type AccountRecord,
} from "@/lib/session";

export const runtime = "nodejs";

const BURST_MS = 60 * 1000;

function honeypotFilled(body: unknown) {
  if (!body || typeof body !== "object") return false;
  return String((body as { company_website?: unknown }).company_website || "").trim().length > 0;
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: "rate" },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  if (honeypotFilled(body)) {
    const trap = rateLimit(`signup-burst:${ip}`, 1, BURST_MS);
    if (!trap.ok) return tooMany(trap.retryAfterSec);
    return NextResponse.json({
      ok: true,
      verified: false,
      confirmationRequired: true,
    });
  }
  const prefill = parseSignupPrefill({
    role: body.role,
    email: body.email,
    name: body.full_name,
    yacht: body.yacht,
    marina: body.marina,
  });
  const email = prefill.email || String(body.email || "").trim().toLowerCase();
  const name = prefill.name || String(body.full_name || "").trim();
  const password = String(body.password || "");
  if (!name) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password" }, { status: 400 });
  }
  const burstIp = rateLimit(`signup-burst:${ip}`, 1, BURST_MS);
  const burstEmail = rateLimit(`signup-email:${email}`, 1, BURST_MS);
  if (!burstIp.ok || !burstEmail.ok) {
    return tooMany(Math.max(burstIp.retryAfterSec, burstEmail.retryAfterSec));
  }

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  if (users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  const pending: PendingCookie[] = [];
  const registered = await registerUnconfirmedUser({
    email,
    password,
    name,
    role: prefill.role || undefined,
    redirectTo: emailConfirmRedirect(req),
    auth: createRouteSupabase(req, pending),
  });
  if (!registered.ok) {
    const status = registered.error === "exists" ? 409 : registered.error === "unconfigured" ? 503 : 502;
    return NextResponse.json({ error: registered.error }, { status });
  }

  const account: AccountRecord = {
    id: registered.id,
    email,
    name,
    hash: hashPassword(password),
  };
  users.push(account);
  if (users.length > 25) users.splice(0, users.length - 25);

  const session = await createSessionToken({ id: registered.id, email, name });
  const vault = await signAccounts(users);
  logFunnel("signup_completed", prefill.role || undefined);
  const res = NextResponse.json({
    user: { id: registered.id, email, name },
    verified: registered.confirmed,
    confirmationRequired: !registered.confirmed,
  });
  const intent = onboardingCookie(prefill);
  if (intent) res.headers.append("Set-Cookie", intent);
  for (const header of clearStaleSupabaseSessionHeaders(req.headers.get("cookie"))) {
    res.headers.append("Set-Cookie", header);
  }
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", accountsCookie(vault));
  const noted = await signCheckEmail(email);
  if (noted) res.headers.append("Set-Cookie", noted);
  applyCookies(res, pending);
  return res;
}
