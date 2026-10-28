import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST as postLogout } from "../app/api/auth/logout/route.ts";
import { GET as getMe } from "../app/api/auth/me/route.ts";
import { decideSession } from "./account-verification.ts";
import { fleetAccess } from "./fleet-access.ts";
import { bookingContact, emptyProfile, PROFILE_COOKIE, signProfileMap, loadBookingContact } from "./profile.ts";
import { createSessionToken, hasSupabaseAuthCookie, SESSION_COOKIE } from "./session.ts";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "ada@kaenz.com", name: "Ada" };

test("a PKCE verifier cookie is not a live Supabase session", () => {
  const header = "sb-project-auth-token-code-verifier=abc; sb-project-auth-token-flows-code-verifier=idx";
  assert.equal(hasSupabaseAuthCookie(header), false);
  assert.equal(hasSupabaseAuthCookie("sb-project-auth-token=jwt"), true);
  assert.equal(hasSupabaseAuthCookie("sb-project-auth-token.0=chunk"), true);
});

test("a confirmed Kaenz cookie is not a session without Supabase", () => {
  const rejected = decideSession({
    cookieUser: user,
    liveUser: null,
    configured: true,
    reachable: true,
    sbCookiesPresent: false,
    signal: "confirmed",
  });
  assert.equal(rejected.user, null);
  assert.equal(rejected.verified, false);

  const revoked = decideSession({
    cookieUser: user,
    liveUser: null,
    configured: true,
    reachable: true,
    sbCookiesPresent: true,
    signal: "unknown",
  });
  assert.equal(revoked.user, null);

  const live = decideSession({
    cookieUser: user,
    liveUser: user,
    configured: true,
    reachable: true,
    sbCookiesPresent: true,
    signal: "confirmed",
  });
  assert.equal(live.user?.email, user.email);
  assert.equal(live.verified, true);

  const unverified = decideSession({
    cookieUser: user,
    liveUser: null,
    configured: true,
    reachable: true,
    sbCookiesPresent: false,
    signal: "unconfirmed",
  });
  assert.equal(unverified.user?.email, user.email);
  assert.equal(unverified.verified, false);

  const outage = decideSession({
    cookieUser: user,
    liveUser: null,
    configured: true,
    reachable: false,
    sbCookiesPresent: true,
    signal: "unknown",
  });
  assert.equal(outage.user?.email, user.email);
  assert.equal(outage.verified, true);
});

test("logout revokes Supabase globally and expires Kaenz and sb cookies", async () => {
  const route = readFileSync(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8");
  assert.match(route, /signOut\(\s*\{\s*scope:\s*"global"\s*\}\s*\)/);

  const keys = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    const res = await postLogout(
      new Request("https://kaenz.com/api/auth/logout", {
        method: "POST",
        headers: {
          host: "kaenz.com",
          cookie: [
            `${SESSION_COOKIE}=abc`,
            "kaenz_accounts=def",
            "kaenz_oauth=state",
            "sb-project-auth-token=jwt",
            "sb-project-auth-token.0=chunk",
            "kaenz_locale=en",
            "kaenz_profiles=keep",
          ].join("; "),
        },
      }),
    );
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "https://kaenz.com/login");
    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const joined = setCookies.join("\n");
    for (const name of [
      SESSION_COOKIE,
      "kaenz_accounts",
      "kaenz_oauth",
      "sb-project-auth-token",
      "sb-project-auth-token.0",
    ]) {
      assert.equal(joined.includes(`${name}=;`), true, name);
    }
    assert.equal(joined.includes("kaenz_locale="), false);
    assert.equal(joined.includes("kaenz_profiles="), false);
    assert.equal(joined.includes("Domain="), false);
    assert.equal(joined.includes("Path=/"), true);
    assert.equal(joined.includes("Secure"), true);
    assert.equal(joined.includes("Max-Age=0"), true);
    const sessionClears = setCookies.filter((header) => header.startsWith(`${SESSION_COOKIE}=;`));
    assert.equal(sessionClears.length, 2);
    assert.equal(sessionClears.some((header) => header.includes("Secure")), true);
    assert.equal(sessionClears.some((header) => !header.includes("Secure")), true);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("auth me ignores a Kaenz cookie when Supabase has no live session for a confirmed user", async () => {
  const keys = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    const token = await createSessionToken(user);
    const open = await getMe(
      new Request("https://kaenz.com/api/auth/me", {
        headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
      }),
    );
    const openBody = (await open.json()) as { user: { email?: string } | null; verified: boolean };
    assert.equal(openBody.user?.email, user.email);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key";
    const closed = await getMe(
      new Request("https://kaenz.com/api/auth/me", {
        headers: {
          cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; sb-example-auth-token=dead`,
        },
      }),
    );
    const closedBody = (await closed.json()) as { user: unknown; verified: boolean };
    assert.equal(closedBody.user, null);
    assert.equal(closedBody.verified, false);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("fleet gate and booking contact follow the server session", async () => {
  assert.equal(fleetAccess(null, false), "anon");
  assert.equal(fleetAccess(user, false), "unverified");
  assert.equal(fleetAccess(user, true), "verified");

  const page = readFileSync(new URL("../app/(site)/fleet/[id]/page.tsx", import.meta.url), "utf8");
  const gate = readFileSync(new URL("../components/pages/BookGate.tsx", import.meta.url), "utf8");
  assert.match(page, /resolveRequestSession/);
  assert.match(page, /loadBookingContact/);
  assert.equal(gate.includes("/api/auth/me"), false);
  assert.match(gate, /VerifyEmailScreen/);

  const profile = emptyProfile(user);
  profile.fullName = "Ada Lovelace";
  profile.phone = "+1 305 555 0100";
  const token = await signProfileMap({ [user.id]: profile });
  const keys = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    const contact = await loadBookingContact(
      `${PROFILE_COOKIE}=${encodeURIComponent(token)}`,
      user,
    );
    assert.deepEqual(contact, bookingContact(user, profile));
    assert.equal(contact.fullName, "Ada Lovelace");
    assert.equal(contact.email, "ada@kaenz.com");
    assert.equal(contact.phone, "+1 305 555 0100");
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
