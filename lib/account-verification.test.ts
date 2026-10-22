import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextResponse } from "next/server";
import { POST as postBooking } from "../app/api/bookings/route.ts";
import { POST as postCheckout } from "../app/api/checkout/route.ts";
import { POST as postGuest } from "../app/api/checkout/guest/route.ts";
import { POST as postLogin } from "../app/api/auth/login/route.ts";
import { POST as postSignup } from "../app/api/auth/signup/route.ts";
import { GET as getProfile } from "../app/api/profile/route.ts";
import { POST as postYacht } from "../app/api/yachts/route.ts";
import { isDeadSessionError } from "./auth/biometric.ts";
import { emailConfirmRedirect } from "./email-verification.ts";
import { loginRedirectPath } from "./login-redirect.ts";
import { hashPassword } from "./passwords.ts";
import {
  accessDecision,
  confirmationSignal,
  previewUnverifiedOverride,
  sessionRepair,
} from "./account-verification.ts";
import { applyCookies, setKaenzSessionCookie } from "./supabase-route.ts";
import { createSessionToken, inspectSession, SESSION_COOKIE, signAccounts, signValue } from "./session.ts";

const user = { id: "user-1", email: "ada@kaenz.com", name: "Ada" };

test("confirmation signal uses Supabase Auth, not a profiles column", () => {
  assert.equal(confirmationSignal(null), "unknown");
  assert.equal(confirmationSignal({ email_confirmed_at: "2026-10-20T00:00:00Z" }), "confirmed");
  assert.equal(confirmationSignal({ user_metadata: { email_verified: true } }), "confirmed");
  assert.equal(confirmationSignal({ email: "ada@kaenz.com" }), "unconfirmed");
  assert.equal(confirmationSignal({ user_metadata: { email_verified: false } }), "unconfirmed");
});

test("access is anonymous, unverified, or allowed", () => {
  assert.equal(accessDecision(null, "unknown"), "anonymous");
  assert.equal(accessDecision(null, "confirmed"), "anonymous");
  assert.equal(accessDecision(user, "unconfirmed"), "unverified");
  assert.equal(accessDecision(user, "confirmed"), "allowed");
  assert.equal(accessDecision(user, "unknown"), "allowed");
});

test("preview unverified header is ignored outside preview", () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    const req = new Request("https://kaenz.com/app", {
      headers: { "x-kaenz-preview-unverified": "1" },
    });
    assert.equal(previewUnverifiedOverride(req), false);
    process.env.VERCEL_ENV = "preview";
    assert.equal(previewUnverifiedOverride(req), true);
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test("signup does not auto-confirm and does not open a session without Supabase", async () => {
  const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
  const sender = readFileSync(new URL("./email-verification.ts", import.meta.url), "utf8");
  assert.equal(signup.includes("email_confirm: true"), false);
  assert.equal(sender.includes("email_confirm: true"), false);

  const keys = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    const res = await postSignup(
      new Request("https://kaenz.com/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ada@kaenz.com",
          full_name: "Ada Lovelace",
          password: "password1",
        }),
      }),
    );
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "unconfigured");
    assert.equal(String(res.headers.get("set-cookie") || "").includes(`${SESSION_COOKIE}=`), false);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

async function sessionRequest(path: string, unverified = false) {
  const token = await createSessionToken(user);
  const headers = new Headers({
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "content-type": "application/json",
  });
  if (unverified) headers.set("x-kaenz-preview-unverified", "1");
  return new Request(`https://kaenz.com${path}`, { method: "POST", headers, body: "{}" });
}

async function expectGate(
  post: (req: Request) => Promise<Response>,
  path: string,
  allowed: (status: number, body: { error?: string }) => void,
) {
  const anonymous = await post(
    new Request(`https://kaenz.com${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(anonymous.status, 401);
  assert.equal(((await anonymous.json()) as { error?: string }).error, "auth");

  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  try {
    const unverified = await post(await sessionRequest(path, true));
    assert.equal(unverified.status, 403);
    const body = (await unverified.json()) as { error?: string; message?: string };
    assert.equal(body.error, "unverified");
    assert.equal(body.message, "Verify your email");
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }

  const verified = await post(await sessionRequest(path, false));
  const verifiedBody = (await verified.json()) as { error?: string };
  assert.notEqual(verified.status, 401);
  assert.notEqual(verifiedBody.error, "unverified");
  allowed(verified.status, verifiedBody);
}

test("confirmation email returns to the request origin callback, not the site root", () => {
  const sender = readFileSync(new URL("./email-verification.ts", import.meta.url), "utf8");
  assert.match(sender, /emailRedirectTo: opts\.redirectTo/);
  assert.match(sender, /emailRedirectTo: redirectTo/);
  const preview = emailConfirmRedirect(
    new Request("https://kaenz.com/api/auth/signup", {
      headers: {
        "x-forwarded-host": "kaenz-preview.vercel.app",
        "x-forwarded-proto": "https",
      },
    }),
  );
  assert.equal(preview, "https://kaenz-preview.vercel.app/auth/callback");
  const prod = emailConfirmRedirect(new Request("https://kaenz.com/api/auth/signup"));
  assert.equal(prod, "https://kaenz.com/auth/callback");
  assert.notEqual(prod, "https://kaenz.com");
  assert.notEqual(prod, "https://kaenz.com/");
  const local = emailConfirmRedirect(
    new Request("http://localhost:3000/api/auth/verify-email", {
      headers: { host: "localhost:3000" },
    }),
  );
  assert.equal(local, "http://localhost:3000/auth/callback");
});

test("booking, checkout, and yacht listing gate the three cases", async () => {
  await expectGate(postBooking, "/api/bookings", (status, body) => {
    assert.equal(status, 400);
    assert.equal(body.error, "fields");
  });
  await expectGate(postCheckout, "/api/checkout", (status) => {
    assert.ok(status === 400 || status === 503);
  });
  await expectGate(postYacht, "/api/yachts", (status, body) => {
    assert.equal(status, 503);
    assert.equal(body.error, "supabase");
  });
});

test("guest checkout is gone for every session state", async () => {
  const anonymous = await postGuest(
    new Request("https://kaenz.com/api/checkout/guest", { method: "POST", body: "{}" }),
  );
  assert.equal(anonymous.status, 410);
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  try {
    const unverified = await postGuest(await sessionRequest("/api/checkout/guest", true));
    assert.equal(unverified.status, 410);
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
  const verified = await postGuest(await sessionRequest("/api/checkout/guest", false));
  assert.equal(verified.status, 410);
  const body = (await verified.json()) as { error?: string };
  assert.equal(body.error, "gone");
});

const SUPABASE_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

function withoutSupabase() {
  const previous = new Map(SUPABASE_KEYS.map((key) => [key, process.env[key]]));
  for (const key of SUPABASE_KEYS) delete process.env[key];
  return () => {
    for (const key of SUPABASE_KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("session failures are named without the cookie value", async () => {
  assert.equal((await inspectSession(null)).reason, "no_cookie");
  assert.equal((await inspectSession("not-a-token")).reason, "bad_sig");
  const expired = await signValue(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) - 5,
    }),
  );
  assert.equal((await inspectSession(expired)).reason, "expired");
  const valid = await inspectSession(await createSessionToken(user));
  assert.equal(valid.reason, null);
  assert.equal(valid.user?.email, user.email);

  assert.deepEqual(sessionRepair({ user: null, verified: false, live: false, cookieReason: "no_cookie" }), {
    reissue: false,
    rejectReason: "no_cookie",
  });
  assert.deepEqual(sessionRepair({ user: null, verified: false, live: false, cookieReason: "bad_sig" }), {
    reissue: false,
    rejectReason: "bad_sig",
  });
  assert.deepEqual(sessionRepair({ user: null, verified: false, live: false, cookieReason: "expired" }), {
    reissue: false,
    rejectReason: "expired",
  });
  assert.deepEqual(sessionRepair({ user: null, verified: false, live: true, cookieReason: null }), {
    reissue: false,
    rejectReason: "no_supabase",
  });
  assert.deepEqual(sessionRepair({ user, verified: true, live: true, cookieReason: "no_cookie" }), {
    reissue: true,
    rejectReason: null,
  });
  assert.equal(sessionRepair({ user, verified: true, live: true, cookieReason: null }).reissue, false);
  assert.equal(sessionRepair({ user, verified: false, live: true, cookieReason: "bad_sig" }).reissue, false);

  const helper = readFileSync(new URL("./account-verification.ts", import.meta.url), "utf8");
  assert.match(helper, /logAuthReject\(session\.rejectReason \|\| "no_supabase"\)/);
  assert.equal(helper.includes("console.info(JSON.stringify({ auth: \"401\", reason }))"), true);
  assert.equal(/console\.(info|log|warn|error)\([^)]*cookie/i.test(helper), false);
});

test("supabase Set-Cookie replacement keeps kaenz_session when it is written last", async () => {
  const token = await createSessionToken(user);
  const dropped = NextResponse.json({ ok: true });
  dropped.headers.append("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly`);
  dropped.cookies.set("sb-example-auth-token", "jwt", { path: "/" });
  assert.equal(
    dropped.headers.getSetCookie().some((header) => header.startsWith(`${SESSION_COOKIE}=`)),
    false,
  );

  const kept = NextResponse.json({ ok: true });
  applyCookies(kept, [{ name: "sb-example-auth-token", value: "jwt", options: { path: "/" } }]);
  setKaenzSessionCookie(kept, token);
  const headers = kept.headers.getSetCookie();
  assert.equal(headers.some((header) => header.startsWith("sb-example-auth-token=")), true);
  const sessionHeader = headers.find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  assert.ok(sessionHeader);
  const value = decodeURIComponent(sessionHeader.slice(SESSION_COOKIE.length + 1).split(";")[0]);
  assert.equal((await inspectSession(value)).user?.email, user.email);
  assert.equal(value.includes(token) || value === token, true);
  assert.equal(headers.join("\n").includes(token) || headers.join("\n").includes(encodeURIComponent(token)), true);
});

test("password login sets kaenz_session, profile is 200, and draft save is past auth", async () => {
  const restore = withoutSupabase();
  try {
    const accounts = await signAccounts([
      { id: user.id, email: user.email, name: user.name, hash: hashPassword("password1") },
    ]);
    const login = await postLogin(
      new Request("https://kaenz.com/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `kaenz_accounts=${encodeURIComponent(accounts)}`,
          "x-forwarded-for": "198.51.100.61",
        },
        body: JSON.stringify({ email: user.email, password: "password1" }),
      }),
    );
    assert.equal(login.status, 200);
    const sessionHeader = login.headers
      .getSetCookie()
      .find((header) => header.startsWith(`${SESSION_COOKIE}=`));
    assert.ok(sessionHeader);
    const token = decodeURIComponent(sessionHeader.slice(SESSION_COOKIE.length + 1).split(";")[0]);
    assert.equal((await inspectSession(token)).user?.email, user.email);
    const cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}`;

    const profile = await getProfile(
      new Request("https://kaenz.com/api/profile", { headers: { cookie } }),
    );
    assert.equal(profile.status, 200);
    const profileBody = (await profile.json()) as { profile?: { email?: string } };
    assert.equal(profileBody.profile?.email, user.email);

    const draft = await postYacht(
      new Request("https://kaenz.com/api/yachts", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          draft: true,
          name: "Sea Fairy",
          home_port: "North dock",
          owner_name: "Ada",
        }),
      }),
    );
    assert.notEqual(draft.status, 401);
    const draftBody = (await draft.json()) as { error?: string };
    assert.equal(draft.status, 503);
    assert.equal(draftBody.error, "supabase");

    const missing = await getProfile(new Request("https://kaenz.com/api/profile"));
    assert.equal(missing.status, 401);
    assert.equal(((await missing.json()) as { error?: string }).error, "auth");
  } finally {
    restore();
  }
});

test("login redirect uses next immediately and fingerprint keeps the vault on 5xx", () => {
  assert.equal(loginRedirectPath("/app/yachts"), "/app/yachts");
  assert.equal(loginRedirectPath("/login?next=/app"), "/login?next=/app");
  assert.equal(loginRedirectPath("//evil.example"), "/app");
  assert.equal(loginRedirectPath("https://evil.example"), "/app");
  assert.equal(loginRedirectPath(null), "/app");

  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(form, /window\.location\.replace\(next\)/);
  assert.match(form, /AbortSignal\.timeout\(12_000\)/);
  assert.equal(form.includes('router.replace("/app")'), false);
  const login = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  const applyAt = login.indexOf("applyCookies(res, pending)");
  const setAt = login.indexOf("setKaenzSessionCookie(res, session)");
  assert.ok(applyAt > 0 && setAt > applyAt);

  assert.equal(isDeadSessionError({ status: 401 }), true);
  assert.equal(isDeadSessionError({ status: 403 }), true);
  assert.equal(isDeadSessionError({ status: 400 }), true);
  assert.equal(isDeadSessionError({ status: 500 }), false);
  assert.equal(isDeadSessionError({ status: 503, message: "invalid session" }), false);
  assert.equal(isDeadSessionError({ name: "TypeError", message: "Failed to fetch" }), false);
  assert.equal(isDeadSessionError({ name: "AuthRetryableFetchError", status: 401 }), false);
  assert.equal(isDeadSessionError({ name: "AuthApiError", message: "refresh_token_not_found" }), true);
  const biometric = readFileSync(
    new URL("../components/auth/BiometricLogin.tsx", import.meta.url),
    "utf8",
  );
  assert.match(biometric, /isDeadSessionError/);
  assert.match(biometric, /disableBiometric\(\)/);
  assert.match(biometric, /onUsePassword\(\)/);

  const guarded = [
    "../app/api/profile/route.ts",
    "../app/api/trips/route.ts",
    "../app/api/yachts/route.ts",
    "../app/api/yachts/uploads/route.ts",
    "../app/api/marinas/route.ts",
    "../app/api/payouts/route.ts",
    "../app/api/holder-key/route.ts",
    "../app/api/bookings/route.ts",
    "../app/api/checkout/route.ts",
  ];
  for (const file of guarded) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(src.includes("readSession("), false, file);
    assert.match(src, /requireSessionUser|requireVerifiedUser/);
  }
});
