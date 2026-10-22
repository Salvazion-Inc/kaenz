import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET as getCallback } from "../app/auth/callback/route.ts";
import { POST as postForgot } from "../app/api/auth/forgot-password/route.ts";
import { POST as postJoin } from "../app/api/join/route.ts";
import { POST as postReset } from "../app/api/auth/reset-password/route.ts";
import {
  EMAIL_VERIFIED_SIGN_IN,
  LINK_INVALID,
  passwordResetMessage,
  passwordResetRedirect,
  verificationLinkExpired,
  verifiedSignInAllowed,
} from "./auth-link.ts";
import {
  signalFromAuthUsers,
  verifiedFromAuthUser,
} from "./account-verification.ts";
import { checkEmailAddress, readCheckEmail, signCheckEmail } from "./check-email.ts";
import { POST as postSignup } from "../app/api/auth/signup/route.ts";
import { clearStaleSupabaseSessionHeaders, resolveAuthSecret } from "./session.ts";
import { at } from "./app-copy.ts";
import { t } from "./copy.ts";
import { captainCredential, traitLabel, yachtClassLabel } from "./listings.ts";
import { routeEndpointName } from "./trip-store.tsx";
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
    assert.equal(codeUrl.pathname, "/check-email");
    assert.equal(codeUrl.searchParams.get("invalid"), "1");
    assert.equal(codeUrl.searchParams.get("verified"), null);
    assert.notEqual(codeUrl.pathname, "/app");

    const token = await getCallback(
      new Request("https://kaenz.com/auth/callback?token_hash=abc&type=signup"),
    );
    const tokenUrl = new URL(token.headers.get("location") || "");
    assert.equal(tokenUrl.pathname, "/check-email");
    assert.equal(tokenUrl.searchParams.get("invalid"), "1");

    const recovery = await getCallback(
      new Request("https://kaenz.com/auth/callback?token_hash=abc&type=recovery"),
    );
    const recoveryUrl = new URL(recovery.headers.get("location") || "");
    assert.equal(recoveryUrl.pathname, "/check-email");
    assert.equal(recoveryUrl.searchParams.get("invalid"), "1");
    assert.equal(recoveryUrl.searchParams.get("verified"), null);

    assert.equal(
      verifiedSignInAllowed({
        user: { id: "user-1", email: "ada@kaenz.com", email_confirmed_at: "2026-10-22T00:00:00Z" },
        session: null,
        recovery: false,
      }),
      true,
    );
    assert.equal(
      verifiedSignInAllowed({
        user: { id: "user-1", email: "ada@kaenz.com", email_confirmed_at: "2026-10-22T00:00:00Z" },
        session: null,
        recovery: true,
      }),
      false,
    );
    assert.equal(
      verifiedSignInAllowed({
        user: { id: "user-1", email: "ada@kaenz.com" },
        session: null,
        recovery: false,
      }),
      false,
    );
    assert.equal(LINK_INVALID, "This link is invalid or already used");

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

test("check-email shows only the signed signup cookie", async () => {
  assert.equal(checkEmailAddress("new@kaenz.com"), "new@kaenz.com");
  assert.equal(checkEmailAddress("not-an-email"), "");
  assert.equal(checkEmailAddress(null), "");
  const header = await signCheckEmail("New@Kaenz.com");
  const token = header.split(";")[0].split("=").slice(1).join("=");
  assert.equal(await readCheckEmail(token), "new@kaenz.com");
  assert.equal(await readCheckEmail(`${token}tampered`), "");
  assert.equal(await readCheckEmail("not-signed"), "");
  const page = readFileSync(new URL("../app/check-email/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Suspense/);
  assert.match(page, /fallback=/);
  assert.match(page, /CHECK_EMAIL_COOKIE/);
  assert.equal(page.includes("sp.email"), false);
  assert.match(page, /invalid/);
  const screen = readFileSync(new URL("../components/VerifyEmailScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /linkInvalid/);
  assert.match(screen, /invalid \? null :/);
  assert.match(screen, /verifyBody/);
  assert.match(t("en").verifyBody, /We sent you a verification link/);
  assert.equal(screen.includes("LINK_INVALID"), false);
  assert.match(screen, /\/api\/auth\/me/);
  assert.match(screen, /hasSession/);
  const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
  assert.match(signup, /clearStaleSupabaseSessionHeaders/);
  assert.match(signup, /signCheckEmail/);
  const cleared = clearStaleSupabaseSessionHeaders(
    "sb-access-token=abc; sb-project-code-verifier=xyz; kaenz_session=1",
  ).join("\n");
  assert.match(cleared, /sb-access-token=/);
  assert.equal(cleared.includes("code-verifier"), false);
  assert.equal(cleared.includes("kaenz_session"), false);
});

test("signup honeypot and burst limit do not create an account", async () => {
  const restore = withoutSupabase();
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(form, /company_website/);
  assert.match(form, /aria-hidden/);
  try {
    const trap = await postSignup(
      new Request("https://kaenz.com/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({
          email: "bot-signup@example.com",
          full_name: "Bot",
          password: "password1",
          company_website: "https://spam.example",
        }),
      }),
    );
    assert.equal(trap.status, 200);
    const ignored = await trap.json();
    assert.equal(ignored.confirmationRequired, true);
    assert.equal(ignored.user, undefined);
    const trapCookies = trap.headers.getSetCookie?.().join("\n") || trap.headers.get("set-cookie") || "";
    assert.equal(trapCookies.includes("kaenz_session="), false);
    assert.equal(trapCookies.includes("kaenz_check_email="), false);

    const again = await postSignup(
      new Request("https://kaenz.com/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({
          email: "bot-signup@example.com",
          full_name: "Bot",
          password: "password1",
          company_website: "https://spam.example",
        }),
      }),
    );
    assert.equal(again.status, 429);

    const first = await postSignup(
      new Request("https://kaenz.com/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.72",
        },
        body: JSON.stringify({
          email: "rate-signup@example.com",
          full_name: "Ada Lovelace",
          password: "password1",
          company_website: "",
        }),
      }),
    );
    assert.equal(first.status, 503);
    const second = await postSignup(
      new Request("https://kaenz.com/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.73",
        },
        body: JSON.stringify({
          email: "rate-signup@example.com",
          full_name: "Ada Lovelace",
          password: "password1",
        }),
      }),
    );
    assert.equal(second.status, 429);
  } finally {
    restore();
  }
});

test("production refuses to sign sessions without AUTH_SECRET", () => {
  const source = readFileSync(new URL("./session.ts", import.meta.url), "utf8");
  assert.equal(source.includes("kaenz-by-salvazion-inc-session-key"), false);
  assert.throws(
    () => resolveAuthSecret({ NODE_ENV: "production" }, "dev-only"),
    /AUTH_SECRET is required in production/,
  );
  assert.equal(
    resolveAuthSecret({ NODE_ENV: "production", AUTH_SECRET: "  real-secret  " }, "dev-only"),
    "real-secret",
  );
  assert.equal(resolveAuthSecret({ NODE_ENV: "test" }, "dev-only"), "dev-only");
  const limiter = readFileSync(new URL("./rate-limit.ts", import.meta.url), "utf8");
  assert.match(limiter, /in memory/i);
  assert.match(limiter, /Upstash/);
  assert.match(limiter, /no rate-limit table/i);
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /in memory/i);
  assert.match(readme, /no rate-limit table/i);
  assert.match(readme, /Upstash/);
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

test("typed trip endpoints bind onto the request card", () => {
  assert.equal(routeEndpointName("Island Gardens", "typed"), "Island Gardens");
  assert.equal(routeEndpointName(undefined, "Brickell"), "Brickell");
  assert.equal(routeEndpointName("  ", "  "), "");
  assert.equal(routeEndpointName("", ""), "");
  const suggest = readFileSync(new URL("../components/app/PlaceSuggest.tsx", import.meta.url), "utf8");
  assert.match(suggest, /onText/);
  const trip = readFileSync(new URL("../components/app/TripTab.tsx", import.meta.url), "utf8");
  assert.match(trip, /originName \|\| destinationName/);
  assert.equal(trip.includes("→ ${destinationName}") || trip.includes("→ ${"), true);
});

test("spanish locale translates the remaining product strings", () => {
  const es = t("es");
  const en = t("en");
  assert.equal(at("es").account.roles.customer.title, "Cliente");
  assert.equal(at("es").account.roles.owner.title, "Dueño");
  assert.equal(at("es").account.roles.captain.title, "Capitán");
  assert.equal(at("es").addYacht.luxurious, "De lujo");
  assert.equal(at("es").addYacht.fast, "Rápido");
  assert.equal(at("es").addYacht.small, "Pequeño");
  assert.equal(traitLabel("fast", "es"), "Rápido");
  assert.equal(yachtClassLabel("Express cruiser", "es"), "Crucero express");
  assert.equal(captainCredential("USCG Master 100 Ton", "es"), "Patrón USCG, 100 toneladas");
  assert.equal(
    captainCredential("USCG OUPV Six-Pack", "es"),
    "Patrón USCG OUPV, hasta 6 pasajeros",
  );
  assert.equal(yachtClassLabel("Bowrider", "es"), "Lancha bowrider");
  assert.match(at("es").yachtsLead, /Rápido, Pequeño o De lujo/);
  assert.equal(at("es").yachtsLead.includes("Fast, Small"), false);
  assert.equal(es.joinCaptains.includes("Six-Pack"), false);
  assert.match(es.joinCaptains, /hasta 6 pasajeros/);
  assert.equal(es.captain, "Capitán");
  assert.match(captainCredential("MMC", "es"), /Licencia MMC/);
  assert.equal(es.forgotPassword, "¿Olvidaste tu contraseña?");
  assert.equal(es.forgotTitle, "Restablece tu contraseña");
  assert.match(es.forgotSent, /Si existe una cuenta/);
  assert.equal(es.checkEmailTitle, "Revisa tu correo");
  assert.equal(es.linkExpired, "Este enlace caducó");
  assert.equal(es.linkInvalid, "Este enlace no es válido o ya se usó");
  assert.equal(es.nav.logout, "Salir");
  assert.equal(en.forgotPassword, "Forgot password?");
  assert.equal(en.linkExpired, "This link expired");
  assert.equal(en.linkInvalid, LINK_INVALID);
  assert.equal(en.forgotSent, "If an account exists for that email, we sent a reset link.");
  assert.match(at("es").addYacht.fileTooBig, /8 MB/);
  assert.match(at("es").addYacht.missingDocs, /Faltan estos documentos/);
  const forgot = readFileSync(new URL("../components/ForgotPasswordForm.tsx", import.meta.url), "utf8");
  assert.match(forgot, /c\.forgotSent/);
  assert.equal(forgot.includes("data.message"), false);
});

test("logout stays hidden without a session and biometric does not cover the form", () => {
  const screen = readFileSync(new URL("../components/VerifyEmailScreen.tsx", import.meta.url), "utf8");
  const account = readFileSync(new URL("../components/app/AccountTab.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  const login = readFileSync(new URL("../components/auth/BiometricLogin.tsx", import.meta.url), "utf8");
  const enroll = readFileSync(new URL("../components/auth/BiometricEnrollPrompt.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/app/AppShell.tsx", import.meta.url), "utf8");
  assert.match(screen, /hasSession \?/);
  assert.match(account, /\/api\/auth\/me/);
  assert.match(account, /hasSession \?/);
  assert.equal(form.includes("thumbGate"), false);
  assert.equal(form.includes("waitingGate"), false);
  assert.match(form, /name="password"/);
  assert.match(form, /offerBiometric/);
  assert.equal(login.includes("useAutoBiometricPrompt"), false);
  assert.equal(login.includes("fixed "), false);
  assert.equal(enroll.includes("fixed "), false);
  assert.match(shell, /<main[\s\S]*<BiometricEnrollPrompt/);
});
