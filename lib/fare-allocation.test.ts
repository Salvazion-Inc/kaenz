import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateBookingShares, marinaShareParty } from "./fare-allocation.ts";

/** $1,000 fare in cents: owner 38%, each marina 3.5%. */
const OWNER = 38_000;
const MARINA = 3_500;
const CAPTAIN = 30_000;

const base = {
  ownerCents: OWNER,
  captainCents: CAPTAIN,
  marinaOriginCents: MARINA,
  marinaDestCents: MARINA,
};

describe("allocateBookingShares", () => {
  it("pays each marina its 3.5% when both are partners", () => {
    const share = allocateBookingShares({
      ...base,
      pickup: "partner",
      dropoff: "partner",
    });
    assert.equal(share.ownerCents, OWNER);
    assert.equal(share.captainCents, CAPTAIN);
    assert.equal(share.marinaPickupCents, MARINA);
    assert.equal(share.marinaDropoffCents, MARINA);
    assert.equal(share.ownerFromMarinaCents, 0);
  });

  it("adds the unregistered marina's 3.5% to the owner when only one is a partner", () => {
    const pickupOnly = allocateBookingShares({
      ...base,
      pickup: "partner",
      dropoff: "unregistered",
    });
    assert.equal(pickupOnly.ownerCents, OWNER + MARINA);
    assert.equal(pickupOnly.captainCents, CAPTAIN);
    assert.equal(pickupOnly.marinaPickupCents, MARINA);
    assert.equal(pickupOnly.marinaDropoffCents, 0);
    assert.equal(pickupOnly.ownerFromMarinaCents, MARINA);

    const dropoffOnly = allocateBookingShares({
      ...base,
      pickup: "unregistered",
      dropoff: "partner",
    });
    assert.equal(dropoffOnly.ownerCents, OWNER + MARINA);
    assert.equal(dropoffOnly.marinaPickupCents, 0);
    assert.equal(dropoffOnly.marinaDropoffCents, MARINA);
    assert.equal(dropoffOnly.ownerFromMarinaCents, MARINA);
  });

  it("adds both marina shares to the owner when neither is a partner", () => {
    const share = allocateBookingShares({
      ...base,
      pickup: "unregistered",
      dropoff: "unregistered",
    });
    assert.equal(share.ownerCents, OWNER + MARINA + MARINA);
    assert.equal(share.captainCents, CAPTAIN);
    assert.equal(share.marinaPickupCents, 0);
    assert.equal(share.marinaDropoffCents, 0);
    assert.equal(share.ownerFromMarinaCents, MARINA + MARINA);
    assert.equal(
      share.ownerCents + share.marinaPickupCents + share.marinaDropoffCents,
      OWNER + MARINA + MARINA,
    );
  });

  it("gives the same-marina 7% to the owner when that marina is not a partner", () => {
    const share = allocateBookingShares({
      ownerCents: OWNER,
      captainCents: CAPTAIN,
      marinaOriginCents: 7_000,
      marinaDestCents: 0,
      pickup: "unregistered",
      dropoff: "unregistered",
    });
    assert.equal(share.ownerCents, OWNER + 7_000);
    assert.equal(share.captainCents, CAPTAIN);
    assert.equal(share.marinaPickupCents, 0);
    assert.equal(share.marinaDropoffCents, 0);
    assert.equal(share.ownerFromMarinaCents, 7_000);
  });

  it("keeps a marina share pending when the partner lookup failed", () => {
    const share = allocateBookingShares({
      ...base,
      pickup: "unknown",
      dropoff: "unregistered",
    });
    assert.equal(share.ownerCents, OWNER + MARINA);
    assert.equal(share.marinaPickupCents, MARINA);
    assert.equal(share.marinaDropoffCents, 0);
  });
});

describe("marinaShareParty", () => {
  it("requires a marina listing and a Stripe account", () => {
    assert.equal(
      marinaShareParty({
        listingUserId: "user-1",
        stripeAccountId: "acct_123",
      }),
      "partner",
    );
    assert.equal(
      marinaShareParty({ listingUserId: "user-1", stripeAccountId: "" }),
      "unregistered",
    );
    assert.equal(
      marinaShareParty({ listingUserId: "", stripeAccountId: "" }),
      "unregistered",
    );
    assert.equal(
      marinaShareParty({
        listingUserId: "",
        stripeAccountId: "",
        lookupFailed: true,
      }),
      "unknown",
    );
  });
});
