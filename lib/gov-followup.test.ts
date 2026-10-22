import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET as getCallback } from "../app/auth/callback/route.ts";
import { POST as postForgot } from "../app/api/auth/forgot-password/route.ts";
import { POST as postJoin } from "../app/api/join/route.ts";
import { POST as postReset } from "../app/api/auth/reset-password/route.ts";
import {
  EMAIL_VERIFIED_SIGN_IN,
  passwordResetMessage,
  passwordResetRedirect,
  verificationLinkExpired,
} from "./auth-link.ts";
import {
  signalFromAuthUsers,
  verifiedFromAuthUser,
} from "./account-verification.ts";
import { checkEmailAddress } from "./check-email.ts";
import { clearStaleSupabaseSessionHeaders } from "./session.ts";
import { yachtById } from "./yachts.ts";

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

test("tempest 42 description does not name Island Gardens", () => {
  const yacht = yachtById("tempest-42");
  assert.ok(yacht);
  for (const text of Object.values(yacht.blurb)) {
    assert.equal(text.includes("Island Gardens"), false);
  }
  assert.equal(yacht.marina, "Island Gardens Miami");
});

test("a filled honeypot is ignored and the same email or IP waits 60s", async () => {
  const restore = withoutSupabase();
  const joinForm = readFileSync(new URL("../components/JoinForm.tsx", import.meta.url), "utf8");
  assert.match(joinForm, /company_website/);
  assert.match(joinForm, /aria-hidden/);
  try {
    const trap = await postJoin(
      new Request("https://kaenz.com/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.41",
        },
        body: JSON.stringify({
          full_name: "Bot",
          email: "bot-trap@example.com",
          company_website: "https://spam.example",
        }),
      }),
    );
    assert.equal(trap.status, 200);
    const ignored = await trap.json();
    assert.equal(ignored.ok, true);
    assert.equal(ignored.stored, "ignored");
    assert.equal(ignored.id, undefined);

    const again = await postJoin(
      new Request("https://kaenz.com/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.41",
        },
        body: JSON.stringify({
          full_name: "Bot",
          email: "bot-trap@example.com",
          company_website: "https://spam.example",
        }),
      }),
    );
    assert.equal(again.status, 429);

    const first = await postJoin(
      new Request("https://kaenz.com/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.42",
        },
        body: JSON.stringify({
          full_name: "Ada Lovelace",
          email: "followup-join@example.com",
          company_website: "",
        }),
      }),
    );
    assert.equal(first.status, 200);
    assert.equal((await first.json()).stored, "local");

    const sameEmail = await postJoin(
      new Request("https://kaenz.com/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.43",
        },
        body: JSON.stringify({
          full_name: "Ada Lovelace",
          email: "followup-join@example.com",
          company_website: "",
        }),
      }),
    );
    assert.equal(sameEmail.status, 429);

    const sameIp = await postJoin(
      new Request("https://kaenz.com/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.42",
        },
        body: JSON.stringify({
          full_name: "Ada Lovelace",
          email: "other-join@example.com",
          company_website: "",
        }),
      }),
    );
    assert.equal(sameIp.status, 429);
  } finally {
    restore();
  }
});

test("callback keeps a session or sends a verified user to sign in", async () => {
  const restore = withoutSupabase();
  const source = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(source, /verifyOtp/);
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /\/login\?verified=1/);
  assert.match(source, /\/reset-password/);
  try {
    const expired = await getCallback(
      new Request("https://kaenz.com/auth/callback?error_code=otp_expired"),
    );
    assert.equal(expired.status, 307);
    const expiredUrl = new URL(expired.headers.get("location") || "");
    assert.equal(expiredUrl.pathname, "/check-email");
    assert.equal(expiredUrl.searchParams.get("expired"), "1");

    const code = await getCallback(new Request("https://kaenz.com/auth/callback?code=abc"));
    const codeUrl = new URL(code.headers.get("location") || "");
    assert.equal(codeUrl.pathname, "/login");
    assert.equal(codeUrl.searchParams.get("verified"), "1");
    assert.notEqual(codeUrl.pathname, "/app");

    const token = await getCallback(
      new Request("https://kaenz.com/auth/callback?token_hash=abc&type=signup"),
    );
    const tokenUrl = new URL(token.headers.get("location") || "");
    assert.equal(tokenUrl.pathname, "/login");
    assert.equal(tokenUrl.searchParams.get("verified"), "1");

    const sniff = await getCallback(new Request("https://kaenz.com/auth/callback"));
    assert.match(sniff.headers.get("content-type") || "", /text\/html/);
    const html = await sniff.text();
    assert.match(html, /error_code/);
    assert.match(html, /\/check-email\?expired=1/);

    assert.equal(
      verificationLinkExpired(new URLSearchParams("error=google")),
      false,
    );
    assert.equal(
      verificationLinkExpired(new URLSearchParams("error=otp_expired")),
      true,
    );
  } finally {
    restore();
  }
});

test("verified follows the auth user and an existing profile can be refreshed", () => {
  assert.equal(
    signalFromAuthUsers(
      { email: "a@b.c" },
      { email_confirmed_at: "2026-10-22T00:00:00Z" },
    ),
    "confirmed",
  );
  assert.equal(signalFromAuthUsers({ email: "a@b.c" }, null), "unconfirmed");
  assert.equal(verifiedFromAuthUser({ email: "a@b.c" }), false);
  assert.equal(
    verifiedFromAuthUser({ email_confirmed_at: "2026-10-22T00:00:00Z" }),
    true,
  );
  const source = readFileSync(new URL("./account-verification.ts", import.meta.url), "utf8");
  assert.match(source, /syncConfirmedProfile/);
  assert.match(source, /\.update\(/);
  assert.equal(source.includes("email_verified:"), false);
  const decide = source.slice(source.indexOf("export function decideSession"));
  assert.match(decide, /user: null, verified: false/);
});

test("check-email prefers the signup address and signup drops the old sb session", () => {
  assert.equal(checkEmailAddress("old@kaenz.com", "new@kaenz.com"), "new@kaenz.com");
  assert.equal(checkEmailAddress("old@kaenz.com", "not-an-email"), "old@kaenz.com");
  assert.equal(checkEmailAddress(null), "");
  const page = readFileSync(new URL("../app/check-email/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Suspense/);
  assert.match(page, /fallback=/);
  const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
  assert.match(signup, /clearStaleSupabaseSessionHeaders/);
  const cleared = clearStaleSupabaseSessionHeaders(
    "sb-access-token=abc; sb-project-code-verifier=xyz; kaenz_session=1",
  ).join("\n");
  assert.match(cleared, /sb-access-token=/);
  assert.equal(cleared.includes("code-verifier"), false);
  assert.equal(cleared.includes("kaenz_session"), false);
});

test("password reset does not reveal whether the account exists", async () => {
  assert.equal(
    passwordResetRedirect("https://kaenz.com"),
    "https://kaenz.com/auth/callback?next=/reset-password",
  );
  assert.equal(
    passwordResetMessage(),
    "If an account exists for that email, we sent a reset link.",
  );
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  const resetForm = readFileSync(
    new URL("../components/ResetPasswordForm.tsx", import.meta.url),
    "utf8",
  );
  assert.match(form, /\/forgot-password/);
  assert.match(form, /EMAIL_VERIFIED_SIGN_IN/);
  assert.equal(EMAIL_VERIFIED_SIGN_IN, "Email verified — please sign in");
  assert.equal(form.includes('router.replace("/app")'), false);
  assert.match(resetForm, /router\.replace\("\/app"\)/);
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /verificationLinkExpired/);
  assert.match(login, /\/check-email\?expired=1/);

  const restore = withoutSupabase();
  try {
    const bad = await postForgot(
      new Request("https://kaenz.com/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.51",
        },
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );
    assert.equal(bad.status, 400);

    const sent = await postForgot(
      new Request("https://kaenz.com/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.52",
        },
        body: JSON.stringify({ email: "nobody@example.com" }),
      }),
    );
    assert.equal(sent.status, 200);
    const body = await sent.json();
    assert.equal(body.ok, true);
    assert.equal(body.message, passwordResetMessage());
    assert.equal("exists" in body, false);

    for (let i = 0; i < 5; i += 1) {
      await postForgot(
        new Request("https://kaenz.com/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.53",
          },
          body: JSON.stringify({ email: "nobody@example.com" }),
        }),
      );
    }
    const limited = await postForgot(
      new Request("https://kaenz.com/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.53",
        },
        body: JSON.stringify({ email: "nobody@example.com" }),
      }),
    );
    assert.equal(limited.status, 429);

    const reset = await postReset(
      new Request("https://kaenz.com/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "password1" }),
      }),
    );
    assert.equal(reset.status, 400);
    const resetBody = await reset.json();
    assert.equal(resetBody.error, "session");
    assert.match(resetBody.message, /Could not update the password/);
  } finally {
    restore();
  }
});
