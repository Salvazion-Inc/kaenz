import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTripCheckout } from "./checkout.ts";
import {
  acceptanceAllowsCheckout,
  captainAutoAcceptEnabled,
  isCaptainRole,
  offerIsAccepted,
  type StoredOffer,
} from "./captain-accept.ts";
import { checkoutCaptainBlock } from "./captain-offers.ts";
import { publicErrorCode } from "./public-error.ts";

/**
 * E2E note (no charge): with CAPTAIN_AUTO_ACCEPT unset, a verified POST /api/checkout
 * for a trip that has no captain acceptance in public.trip_offers returns 409
 * {"error":"captain_required"} and does not open Stripe. The Pay button stays off
 * /app/trip until GET /api/offers?id=<offer> reports accepted for that customer.
 * Rollback: CAPTAIN_AUTO_ACCEPT=1, or git revert the commit. Do not DROP the table
 * without a DEC from Cristian.
 */

const OFFER = "11111111-1111-4111-8111-111111111111";

function row(patch: Partial<StoredOffer> = {}): StoredOffer {
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
    status: "accepted",
    acceptedBy: "captain-1",
    acceptedAt: "2026-11-05T12:00:00.000Z",
    ...patch,
  };
}

function withEnv(values: Record<string, string | undefined>, fn: () => Promise<void>) {
  const keys = Object.keys(values);
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return fn().finally(() => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("captain auto-accept stays off unless the server flag is 1 or true", () => {
  assert.equal(captainAutoAcceptEnabled({}), false);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: "" }), false);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: "0" }), false);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: "false" }), false);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: "yes" }), false);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: "1" }), true);
  assert.equal(captainAutoAcceptEnabled({ CAPTAIN_AUTO_ACCEPT: " true " }), true);
  assert.equal(isCaptainRole("captain"), true);
  assert.equal(isCaptainRole("both"), true);
  assert.equal(isCaptainRole("owner"), false);
  assert.equal(isCaptainRole("customer"), false);
});

test("checkout allows only a persisted captain acceptance for that customer and yacht", () => {
  const accepted = row();
  assert.equal(offerIsAccepted(accepted), true);
  assert.equal(acceptanceAllowsCheckout(accepted, "customer-1", "galeon"), true);
  assert.equal(acceptanceAllowsCheckout(null, "customer-1", "galeon"), false);
  assert.equal(
    acceptanceAllowsCheckout(row({ status: "offered", acceptedBy: "", acceptedAt: "" }), "customer-1", "galeon"),
    false,
  );
  assert.equal(acceptanceAllowsCheckout(row({ acceptedBy: "" }), "customer-1", "galeon"), false);
  assert.equal(acceptanceAllowsCheckout(row({ acceptedAt: "" }), "customer-1", "galeon"), false);
  assert.equal(acceptanceAllowsCheckout(row({ yachtId: "" }), "customer-1", "galeon"), false);
  assert.equal(acceptanceAllowsCheckout(accepted, "someone-else", "galeon"), false);
  assert.equal(acceptanceAllowsCheckout(accepted, "customer-1", "other-yacht"), false);
  assert.equal(
    acceptanceAllowsCheckout(row({ acceptedBy: "customer-1" }), "customer-1", "galeon"),
    false,
  );
  assert.equal(publicErrorCode("captain_required"), "captain_required");
});

test("E2E: checkout pauses before the captain gate, then returns 409", async () => {
  await withEnv(
    {
      CAPTAIN_AUTO_ACCEPT: undefined,
      STRIPE_SECRET_KEY: "sk_test_unit_not_used",
      TRIP_CHECKOUT_ENABLED: undefined,
    },
    async () => {
      const paused = await createTripCheckout({
        req: new Request("https://kaenz.com/api/checkout", { method: "POST" }),
        body: {
          yachtId: "galeon",
          email: "ada@example.com",
          full_name: "Ada Lovelace",
          offerId: OFFER,
        },
        user: { id: "customer-1", email: "ada@example.com", name: "Ada Lovelace" },
      });
      assert.equal(paused.status, 503);
      assert.equal("error" in paused && paused.error, "trip_checkout_paused");

      const blocked = await checkoutCaptainBlock({
        offerId: OFFER,
        userId: "customer-1",
        yachtId: "galeon",
        load: async () => row({ status: "offered", acceptedBy: "", acceptedAt: "" }),
      });
      assert.equal(blocked?.status, 409);
      assert.equal(blocked?.error, "captain_required");

      const allowed = await checkoutCaptainBlock({
        offerId: OFFER,
        userId: "customer-1",
        yachtId: "galeon",
        load: async () => row(),
      });
      assert.equal(allowed, null);
    },
  );

  await withEnv(
    {
      CAPTAIN_AUTO_ACCEPT: undefined,
      STRIPE_SECRET_KEY: "sk_test_unit_not_used",
      TRIP_CHECKOUT_ENABLED: "1",
    },
    async () => {
      const result = await createTripCheckout({
        req: new Request("https://kaenz.com/api/checkout", { method: "POST" }),
        body: {
          yachtId: "galeon",
          email: "ada@example.com",
          full_name: "Ada Lovelace",
          offerId: OFFER,
        },
        user: { id: "customer-1", email: "ada@example.com", name: "Ada Lovelace" },
      });
      assert.equal(result.status, 409);
      assert.equal("error" in result && result.error, "captain_required");
    },
  );
});

test("CAPTAIN_AUTO_ACCEPT=1 restores checkout past the captain gate", async () => {
  await withEnv(
    {
      CAPTAIN_AUTO_ACCEPT: "1",
      STRIPE_SECRET_KEY: undefined,
      TRIP_CHECKOUT_ENABLED: undefined,
    },
    async () => {
      const skipped = await checkoutCaptainBlock({
        offerId: "",
        userId: "",
        yachtId: "",
        load: async () => null,
      });
      assert.equal(skipped, null);
      const paused = await createTripCheckout({
        req: new Request("https://kaenz.com/api/checkout", { method: "POST" }),
        body: { yachtId: "galeon" },
        user: { id: "customer-1", email: "ada@example.com", name: "Ada" },
      });
      assert.equal(paused.status, 503);
      assert.equal("error" in paused && paused.error, "trip_checkout_paused");
    },
  );

  await withEnv(
    {
      CAPTAIN_AUTO_ACCEPT: "1",
      STRIPE_SECRET_KEY: undefined,
      TRIP_CHECKOUT_ENABLED: "1",
    },
    async () => {
      const result = await createTripCheckout({
        req: new Request("https://kaenz.com/api/checkout", { method: "POST" }),
        body: { yachtId: "galeon" },
        user: { id: "customer-1", email: "ada@example.com", name: "Ada" },
      });
      assert.equal(result.status, 503);
      assert.equal("error" in result && result.error, "stripe_unconfigured");
    },
  );
});

test("trip pay stays behind a server acceptance and the migration is minimal", () => {
  const trip = readFileSync(new URL("../components/app/TripTab.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../components/pages/GuestBookForm.tsx", import.meta.url), "utf8");
  const checkout = readFileSync(new URL("./checkout.ts", import.meta.url), "utf8");
  const acceptRoute = readFileSync(
    new URL("../app/api/offers/accept/route.ts", import.meta.url),
    "utf8",
  );
  const sql = readFileSync(
    new URL("../supabase/migrations/20261105_trip_offers.sql", import.meta.url),
    "utf8",
  );
  assert.match(trip, /if \(!acceptanceReady \|\| !autoAccept\) return/);
  assert.match(trip, /waitingForCaptain/);
  assert.match(trip, /offerId: trip\.bookingId/);
  assert.equal(trip.includes("NEXT_PUBLIC_CAPTAIN_AUTO_ACCEPT"), false);
  assert.match(form, /autoAccept \|\| accepted/);
  assert.match(form, /waitingForCaptain/);
  assert.match(form, /offerId/);
  const pauseAt = checkout.indexOf("if (!tripCheckoutEnabled())");
  const captainAt = checkout.indexOf("await checkoutCaptainBlock");
  const stripeAt = checkout.indexOf("if (!stripeConfigured())");
  const chargeAt = checkout.indexOf("checkout.sessions.create");
  assert.ok(pauseAt > 0 && pauseAt < captainAt && captainAt < stripeAt && stripeAt < chargeAt);
  assert.match(acceptRoute, /userIsCaptain/);
  assert.match(acceptRoute, /requireVerifiedUser/);
  assert.match(sql, /DEC-20261105-01/);
  assert.match(sql, /DEC-20261021-02/);
  assert.match(sql, /revoke all on table public\.trip_offers from anon, authenticated/i);
  assert.match(
    sql,
    /grant select, insert, update, delete on table public\.trip_offers to service_role/i,
  );
  assert.equal(/grant\s+all/i.test(sql), false);
  assert.equal(
    sql.split("\n").some((line) => /^\s*truncate\b/i.test(line)),
    false,
  );
  assert.equal(/grant select on table public\.trip_offers to anon/i.test(sql), false);
});
