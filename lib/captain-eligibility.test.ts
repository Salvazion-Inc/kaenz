import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { StoredOffer } from "./captain-accept.ts";
import {
  decideCaptainOfferAction,
  gateProfileRole,
  joinApplicationRole,
} from "./captain-eligibility.ts";
import { acceptTripOffer, declineTripOffer, userIsCaptain } from "./captain-offers.ts";

const OFFER = "11111111-1111-4111-8111-111111111111";
const GALEON = { id: "yacht-1", slug: "galeon" };

function offer(patch: Partial<StoredOffer> = {}): StoredOffer {
  return {
    id: OFFER,
    userId: "customer-1",
    customerName: "Ada",
    yachtId: "galeon",
    originName: "Miami Beach Marina",
    destName: "Palm Beach",
    guests: 4,
    kind: "tour",
    hours: 4,
    status: "offered",
    acceptedBy: "",
    acceptedAt: "",
    ...patch,
  };
}

test("profile and join cannot raise captain without a server assignment", () => {
  assert.deepEqual(
    gateProfileRole({ requested: "captain", current: "customer", eligible: false }),
    { ok: false, status: 403, error: "captain" },
  );
  assert.deepEqual(
    gateProfileRole({ requested: "both", current: "customer", eligible: false }),
    { ok: false, status: 403, error: "captain" },
  );
  assert.deepEqual(
    gateProfileRole({ requested: "captain", current: "customer", eligible: true }),
    { ok: true, role: "captain" },
  );
  assert.equal(joinApplicationRole(undefined), "owner");
  assert.equal(joinApplicationRole(""), "owner");
  assert.equal(joinApplicationRole("both"), "owner");
  assert.equal(joinApplicationRole("captain"), "captain");
});

test("a client who changes role to captain gets 403", async () => {
  const who = await userIsCaptain("customer-1", async () => ({
    ok: true,
    verified: false,
    yachts: [],
  }));
  assert.equal(who.ok, false);
  if (!who.ok) assert.equal(who.status, 403);
  const result = await acceptTripOffer({
    id: OFFER,
    captainId: "customer-1",
    yachtId: "galeon",
    load: async () => offer(),
    eligibility: { verified: false, yachts: [] },
  });
  assert.equal("status" in result && result.status, 403);
  assert.equal("error" in result && result.error, "captain");
});

test("an unassigned captain cannot accept or decline", async () => {
  const decision = decideCaptainOfferAction({
    captainId: "captain-1",
    customerId: "customer-1",
    yachtId: "galeon",
    offerYachtId: "galeon",
    yachts: [],
    kind: "accept",
  });
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.status, 403);
  const accepted = await acceptTripOffer({
    id: OFFER,
    captainId: "captain-1",
    yachtId: "galeon",
    load: async () => offer(),
    eligibility: { verified: true, yachts: [] },
  });
  assert.equal("status" in accepted && accepted.status, 403);
  const declined = await declineTripOffer(OFFER, "captain-1", {
    load: async () => offer(),
    eligibility: { verified: true, yachts: [] },
  });
  assert.equal("status" in declined && declined.status, 403);
});

test("a foreign yachtId is rejected and a captain cannot accept their own request", async () => {
  const foreign = await acceptTripOffer({
    id: OFFER,
    captainId: "captain-1",
    yachtId: "other-boat",
    load: async () => offer(),
    eligibility: { verified: true, yachts: [GALEON] },
  });
  assert.equal("status" in foreign && foreign.status, 403);
  assert.equal("error" in foreign && foreign.error, "yacht");
  const self = await acceptTripOffer({
    id: OFFER,
    captainId: "customer-1",
    yachtId: "galeon",
    load: async () => offer({ userId: "customer-1" }),
    eligibility: { verified: true, yachts: [GALEON] },
  });
  assert.equal("status" in self && self.status, 403);
  assert.equal("error" in self && self.error, "captain");
  const missing = decideCaptainOfferAction({
    captainId: "captain-1",
    customerId: "customer-1",
    yachtId: "",
    offerYachtId: "",
    yachts: [GALEON],
    kind: "accept",
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 400);
});

test("captain authority is not profiles.role and join does not elevate", () => {
  const offers = readFileSync(new URL("./captain-offers.ts", import.meta.url), "utf8");
  const profile = readFileSync(new URL("../app/api/profile/route.ts", import.meta.url), "utf8");
  const join = readFileSync(new URL("../app/api/join/route.ts", import.meta.url), "utf8");
  const sql = readFileSync(
    new URL("../supabase/migrations/20261105_trip_offers.sql", import.meta.url),
    "utf8",
  );
  assert.match(offers, /captain_verified/);
  assert.match(offers, /captain_user_id/);
  assert.equal(offers.includes('.select("role")'), false);
  assert.match(profile, /gateProfileRole/);
  assert.equal(profile.includes("captain_verified:"), false);
  assert.match(join, /joinApplicationRole/);
  assert.match(join, /status: "pending"/);
  assert.equal(join.includes('from("profiles")'), false);
  assert.equal(join.includes('|| "captain"'), false);
  assert.match(sql, /GOV-FAIL-KNZ26-CODE/);
  assert.match(sql, /captain_verified boolean not null default false/);
  assert.equal(/grant\s+all/i.test(sql), false);
});
