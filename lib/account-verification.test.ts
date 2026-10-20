import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST as postBooking } from "../app/api/bookings/route.ts";
import { POST as postCheckout } from "../app/api/checkout/route.ts";
import { POST as postGuest } from "../app/api/checkout/guest/route.ts";
import { POST as postSignup } from "../app/api/auth/signup/route.ts";
import { POST as postYacht } from "../app/api/yachts/route.ts";
import {
  accessDecision,
  confirmationSignal,
  previewUnverifiedOverride,
} from "./account-verification.ts";
import { createSessionToken, SESSION_COOKIE } from "./session.ts";

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
    assert.equal(body.message, "Verifica tu correo");
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

test("booking, checkout, guest checkout, and yacht listing gate the three cases", async () => {
  await expectGate(postBooking, "/api/bookings", (status, body) => {
    assert.equal(status, 400);
    assert.equal(body.error, "fields");
  });
  await expectGate(postCheckout, "/api/checkout", (status) => {
    assert.ok(status === 400 || status === 503);
  });
  await expectGate(postGuest, "/api/checkout/guest", (status, body) => {
    assert.equal(status, 403);
    assert.equal(body.error, "guest");
  });
  await expectGate(postYacht, "/api/yachts", (status, body) => {
    assert.equal(status, 503);
    assert.equal(body.error, "supabase");
  });
});
