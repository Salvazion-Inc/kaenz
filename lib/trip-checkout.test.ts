import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET, POST } from "../app/api/checkout/route.ts";
import { createTripCheckout } from "./checkout.ts";
import { publicErrorCode } from "./public-error.ts";
import { createSessionToken, SESSION_COOKIE } from "./session.ts";
import { tripCheckoutEnabled } from "./trip-checkout.ts";

const user = { id: "user-1", email: "ada@kaenz.com", name: "Ada" };

function restore(
  name: "TRIP_CHECKOUT_ENABLED" | "STRIPE_SECRET_KEY" | "CAPTAIN_AUTO_ACCEPT",
  previous: string | undefined,
) {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

test("trip checkout opens only for the exact server values 1 and true", () => {
  assert.equal(tripCheckoutEnabled({}), false);
  assert.equal(tripCheckoutEnabled({ TRIP_CHECKOUT_ENABLED: undefined }), false);
  for (const value of ["", "0", "yes", "TRUE", "True", "1 ", " true", "on"]) {
    assert.equal(tripCheckoutEnabled({ TRIP_CHECKOUT_ENABLED: value }), false, value);
  }
  assert.equal(tripCheckoutEnabled({ TRIP_CHECKOUT_ENABLED: "1" }), true);
  assert.equal(tripCheckoutEnabled({ TRIP_CHECKOUT_ENABLED: "true" }), true);
});

test("createTripCheckout and POST /api/checkout pause before Stripe", async () => {
  const previousFlag = process.env.TRIP_CHECKOUT_ENABLED;
  const previousStripe = process.env.STRIPE_SECRET_KEY;
  const previousAuto = process.env.CAPTAIN_AUTO_ACCEPT;
  process.env.STRIPE_SECRET_KEY = "sk_test_unit_not_used";
  delete process.env.TRIP_CHECKOUT_ENABLED;
  delete process.env.CAPTAIN_AUTO_ACCEPT;
  try {
    const paused = await createTripCheckout({
      req: new Request("https://kaenz.com/api/checkout"),
      body: { yachtId: "tempest-42", email: user.email, full_name: user.name },
      user,
    });
    assert.deepEqual(paused, { error: "trip_checkout_paused", status: 503 });

    process.env.TRIP_CHECKOUT_ENABLED = "TRUE";
    const stillPaused = await createTripCheckout({
      req: new Request("https://kaenz.com/api/checkout"),
      body: {},
      user,
    });
    assert.deepEqual(stillPaused, { error: "trip_checkout_paused", status: 503 });

    const token = await createSessionToken(user);
    delete process.env.TRIP_CHECKOUT_ENABLED;
    const res = await POST(
      new Request("https://kaenz.com/api/checkout", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ yachtId: "tempest-42", email: user.email, full_name: user.name }),
      }),
    );
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "trip_checkout_paused" });
    assert.equal(publicErrorCode("trip_checkout_paused"), "trip_checkout_paused");

    const lookup = await GET(new Request("https://kaenz.com/api/checkout"));
    const lookupBody = (await lookup.json()) as { error?: string };
    assert.notEqual(lookupBody.error, "trip_checkout_paused");

    process.env.TRIP_CHECKOUT_ENABLED = "1";
    process.env.STRIPE_SECRET_KEY = "sk_test_unit_not_used";
    const captainBlocked = await createTripCheckout({
      req: new Request("https://kaenz.com/api/checkout"),
      body: { yachtId: "tempest-42", email: user.email, full_name: user.name },
      user,
    });
    assert.deepEqual(captainBlocked, { error: "captain_required", status: 409 });
    const captainPost = await POST(
      new Request("https://kaenz.com/api/checkout", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ yachtId: "tempest-42", email: user.email, full_name: user.name }),
      }),
    );
    assert.equal(captainPost.status, 409);
    assert.deepEqual(await captainPost.json(), { error: "captain_required" });

    process.env.CAPTAIN_AUTO_ACCEPT = "1";
    delete process.env.STRIPE_SECRET_KEY;
    const opened = await createTripCheckout({
      req: new Request("https://kaenz.com/api/checkout"),
      body: { yachtId: "tempest-42" },
      user,
    });
    assert.deepEqual(opened, { error: "stripe_unconfigured", status: 503 });

    process.env.TRIP_CHECKOUT_ENABLED = "true";
    const openedTrue = await createTripCheckout({
      req: new Request("https://kaenz.com/api/checkout"),
      body: { yachtId: "tempest-42" },
      user,
    });
    assert.deepEqual(openedTrue, { error: "stripe_unconfigured", status: 503 });
  } finally {
    restore("TRIP_CHECKOUT_ENABLED", previousFlag);
    restore("STRIPE_SECRET_KEY", previousStripe);
    restore("CAPTAIN_AUTO_ACCEPT", previousAuto);
  }

  const checkout = readFileSync(new URL("./checkout.ts", import.meta.url), "utf8");
  const gate = checkout.indexOf("if (!tripCheckoutEnabled())");
  const captain = checkout.indexOf("await checkoutCaptainBlock");
  const stripeReady = checkout.indexOf("if (!stripeConfigured())");
  const stripeCall = checkout.indexOf("checkout.sessions.create");
  const stripeClient = checkout.indexOf("getStripe()");
  assert.ok(gate > 0 && gate < captain && captain < stripeReady && stripeReady < stripeClient && stripeClient < stripeCall);

  const route = readFileSync(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8");
  const routePause = route.indexOf("if (!tripCheckoutEnabled())");
  const routeCreate = route.indexOf("await createTripCheckout");
  assert.ok(routePause > 0 && routePause < routeCreate);
  assert.equal(route.includes("checkout.sessions.create"), false);
  assert.equal(route.includes("NEXT_PUBLIC_TRIP_CHECKOUT"), false);

  const webhook = readFileSync(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
  const payouts = readFileSync(new URL("../app/api/payouts/route.ts", import.meta.url), "utf8");
  assert.equal(webhook.includes("TRIP_CHECKOUT_ENABLED"), false);
  assert.equal(payouts.includes("TRIP_CHECKOUT_ENABLED"), false);
  assert.equal(webhook.includes("trip_checkout_paused"), false);

  const shell = readFileSync(new URL("../components/DocumentShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /tripCheckoutEnabled\(\)/);
  assert.equal(shell.includes("NEXT_PUBLIC_TRIP_CHECKOUT"), false);

  for (const file of [
    "../components/app/TripTab.tsx",
    "../components/pages/GuestBookForm.tsx",
    "../components/TripCheckoutFlag.tsx",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(src.includes("process.env.TRIP_CHECKOUT_ENABLED"), false, file);
    assert.equal(src.includes("NEXT_PUBLIC_TRIP_CHECKOUT"), false, file);
  }
  const trip = readFileSync(new URL("../components/app/TripTab.tsx", import.meta.url), "utf8");
  assert.match(trip, /useTripCheckoutEnabled/);
  assert.match(trip, /!checkoutOpen && \(showPay \|\| awaitingCaptain\)/);
  assert.match(trip, /waitingForCaptain/);
  assert.match(trip, /tripCheckoutPausedNotice/);
  const book = readFileSync(new URL("../components/pages/GuestBookForm.tsx", import.meta.url), "utf8");
  assert.match(book, /checkoutOpen \?/);
  assert.match(book, /waitingForCaptain/);
  assert.match(book, /autoAccept \|\| accepted/);

  const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.equal(example.includes("TRIP_CHECKOUT_ENABLED=1"), false);
  assert.equal(example.includes("NEXT_PUBLIC_TRIP_CHECKOUT"), false);
  assert.match(example, /# TRIP_CHECKOUT_ENABLED=/);
  assert.equal(readme.includes("TRIP_CHECKOUT_ENABLED=1"), false);
  assert.match(readme, /until #26 has code and production PASS/);
  assert.match(readme, /DEC-20261105-02/);
});
