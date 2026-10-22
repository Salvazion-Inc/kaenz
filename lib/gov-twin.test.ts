import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DELETE as deleteGuest,
  GET as getGuest,
  HEAD as headGuest,
  OPTIONS as optionsGuest,
  PATCH as patchGuest,
  POST as postGuest,
  PUT as putGuest,
} from "../app/api/checkout/guest/route.ts";
import { POST as postVerify } from "../app/api/auth/verify-email/route.ts";
import { checkEmailAddress } from "./check-email.ts";
import { funnelRecord, FUNNEL_STEPS } from "./funnel.ts";
import { buildMarinaDraft, buildYachtDraft } from "./listing-draft.ts";
import { onboardingCookie, parseSignupPrefill, readOnboardingIntent } from "./signup-prefill.ts";
import { withoutSeededRequest } from "./trip-store.tsx";

test("marketing mockup does not claim a live Miami trip", () => {
  const phone = readFileSync(new URL("../components/AppPhonePreview.tsx", import.meta.url), "utf8");
  const map = readFileSync(new URL("../components/WorldMap.tsx", import.meta.url), "utf8");
  assert.match(phone, /example/);
  assert.equal(phone.includes("liveBadge"), false);
  assert.equal(phone.includes("liveTrip"), false);
  assert.equal(phone.includes("Miami Beach Marina"), false);
  assert.equal(phone.includes("Island Gardens"), false);
  assert.match(map, /routeExample/);
  assert.equal(map.includes("demoOrigin.name"), false);
  assert.equal(map.includes("{c.liveBadge} · {c.liveTrip}"), true);
});

test("your trip starts empty and drops the seeded request", () => {
  const store = readFileSync(new URL("./trip-store.tsx", import.meta.url), "utf8");
  assert.match(store, /originId: ""/);
  assert.match(store, /destinationId: ""/);
  assert.match(store, /yachtId: ""/);
  const seeded = withoutSeededRequest({
    originId: "miami-beach-marina",
    destinationId: "brickell",
    yachtId: "galeon",
    status: "draft",
  });
  assert.equal(seeded.originId, "");
  assert.equal(seeded.destinationId, "");
  assert.equal(seeded.yachtId, "");
  const kept = withoutSeededRequest({
    originId: "miami-beach-marina",
    destinationId: "brickell",
    yachtId: "galeon",
    status: "requested",
    bookingId: "bk_1",
  });
  assert.equal(kept.originId, "miami-beach-marina");
  assert.equal(kept.yachtId, "galeon");
});

test("guest checkout is gone for every method", async () => {
  for (const call of [getGuest, postGuest, putGuest, patchGuest, deleteGuest, optionsGuest, headGuest]) {
    const res = await call();
    assert.equal(res.status, 410);
    if (call === headGuest) continue;
    const body = await res.json();
    assert.equal(body.error, "gone");
    assert.match(body.message, /Guest checkout is closed/);
  }
});

test("resend without an email explains what to do", async () => {
  const res = await postVerify(
    new Request("https://kaenz.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "email");
  assert.match(body.message, /Add the email address/);
  assert.equal(checkEmailAddress(null), "");
  assert.equal(checkEmailAddress("not-an-email"), "");
  assert.equal(checkEmailAddress("ada@kaenz.com"), "ada@kaenz.com");
});

test("logged-out fleet asks to sign in", () => {
  const grid = readFileSync(new URL("../components/pages/FleetGrid.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../components/pages/YachtDetail.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(grid, /signInToBook/);
  assert.match(grid, /\/login\?next=/);
  assert.match(detail, /signInToBook/);
  assert.match(detail, /\/login\?next=/);
  assert.match(form, /confirmationRequired === true/);
  assert.match(form, /router\.replace\("\/check-email"\)/);
  assert.equal(form.includes("/check-email?email="), false);
});

test("partner signup links only keep safe prefill", () => {
  const parsed = parseSignupPrefill({
    role: "OWNER",
    email: "Ada@Example.com",
    name: "Ada\nLovelace",
    yacht: "  Sea Fairy  ",
    marina: "Marina\u0000One",
  });
  assert.deepEqual(parsed, {
    role: "owner",
    email: "ada@example.com",
    name: "AdaLovelace",
    yacht: "Sea Fairy",
    marina: "MarinaOne",
  });
  assert.equal(parseSignupPrefill({ role: "admin", email: "nope" }).role, "");
  assert.equal(parseSignupPrefill({ email: "not-an-email" }).email, "");
  const cookie = onboardingCookie(parsed);
  assert.equal(cookie.includes("ada@example.com"), false);
  assert.equal(cookie.includes("AdaLovelace"), false);
  assert.equal(cookie.includes('"name"'), false);
  assert.equal(cookie.includes("password"), false);
  const read = readOnboardingIntent(cookie.split(";")[0]);
  assert.equal(read.role, "owner");
  assert.equal(read.yacht, "Sea Fairy");
  assert.equal(read.email, "");
  assert.equal(read.name, "");
  const poisoned = readOnboardingIntent(
    `kaenz_onboarding=${encodeURIComponent(JSON.stringify({ role: "captain", name: "Ada Lovelace", yacht: "Sea Fairy" }))}`,
  );
  assert.equal(poisoned.name, "");
  assert.equal(poisoned.role, "captain");
});

test("a listing draft defers documents and a full listing still requires them", () => {
  const draft = buildYachtDraft({
    name: "Sea Fairy",
    homePort: "North dock",
    ownerName: "Ada",
  });
  assert.equal(draft.ok, true);
  if (draft.ok) {
    assert.equal(draft.status, "draft");
    assert.equal(draft.documents, "pending");
  }
  assert.equal(buildYachtDraft({ name: "A" }).ok, false);
  const marina = buildMarinaDraft({ name: "North dock" });
  assert.equal(marina.ok, true);
  if (marina.ok) assert.equal(marina.documents, "pending");

  const route = readFileSync(new URL("../app/api/yachts/route.ts", import.meta.url), "utf8");
  assert.match(route, /requireVerifiedUser/);
  assert.match(route, /draft === true/);
  assert.match(route, /isHin\(hin\)/);
  assert.match(route, /documents: "pending"/);
  const marinaRoute = readFileSync(new URL("../app/api/marinas/route.ts", import.meta.url), "utf8");
  assert.match(marinaRoute, /requireVerifiedUser/);
  assert.match(marinaRoute, /isWebsite\(website\)/);
});

test("funnel steps stay free of personal data and the migration is not applied", () => {
  assert.deepEqual(FUNNEL_STEPS, [
    "signup_started",
    "signup_completed",
    "email_verified",
    "listing_started",
    "listing_submitted",
  ]);
  const row = funnelRecord("signup_started", "owner");
  assert.ok(row);
  assert.equal("email" in (row || {}), false);
  assert.equal(row && row.role, "owner");
  assert.equal(funnelRecord("password_reset"), null);
  assert.equal(funnelRecord("signup_started", "admin")?.role, undefined);
  const sql = readFileSync(
    new URL("../supabase/migrations/20261022_funnel_events.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /revoke all on table public.funnel_events from anon, authenticated/i);
  assert.match(sql, /grant select, insert on table public.funnel_events to service_role/i);
  assert.equal(/truncate/i.test(sql), false);
  assert.match(sql, /Not applied/);
});
