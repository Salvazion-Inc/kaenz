import Stripe from "stripe";
import type { ChargeBreakdown } from "./pricing";

let client: Stripe | null | undefined;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("stripe_unconfigured");
  }
  if (client === undefined || client === null) {
    client = new Stripe(key);
  }
  return client;
}

export function appOrigin(req: Request) {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "https://kaenz.com";
}

export type TripPayoutAccounts = {
  owner?: string;
  captain?: string;
  marinaPickup?: string;
  marinaDropoff?: string;
};

function connectId(value: string | undefined | null) {
  const id = String(value || "").trim();
  return /^acct_[A-Za-z0-9]+$/.test(id) ? id : "";
}

export function payoutAccountsFromEnv(): TripPayoutAccounts {
  return {
    owner: connectId(process.env.STRIPE_CONNECT_OWNER) || undefined,
    captain: connectId(process.env.STRIPE_CONNECT_CAPTAIN) || undefined,
    marinaPickup:
      connectId(process.env.STRIPE_CONNECT_MARINA_PICKUP) || undefined,
    marinaDropoff:
      connectId(process.env.STRIPE_CONNECT_MARINA_DROPOFF) || undefined,
  };
}

export async function transferTripShares(opts: {
  stripe: Stripe;
  charge: ChargeBreakdown;
  transferGroup: string;
  bookingId: string;
  accounts: TripPayoutAccounts;
}) {
  const { stripe, charge, transferGroup, bookingId, accounts } = opts;
  const results: { role: string; id?: string; amount: number; skipped?: string }[] =
    [];

  async function send(
    role: string,
    amount: number,
    destination: string | undefined,
  ) {
    if (amount <= 0) {
      results.push({ role, amount, skipped: "zero" });
      return;
    }
    if (!destination) {
      results.push({ role, amount, skipped: "no_account" });
      return;
    }
    const transfer = await stripe.transfers.create({
      amount,
      currency: "usd",
      destination,
      transfer_group: transferGroup,
      metadata: { role, booking_id: bookingId },
    });
    results.push({ role, amount, id: transfer.id });
  }

  await send("owner", charge.ownerCents, accounts.owner);
  await send("captain", charge.captainTotalCents, accounts.captain);
  await send("marina_pickup", charge.marinaOriginCents, accounts.marinaPickup);
  await send(
    "marina_dropoff",
    charge.marinaDestCents,
    accounts.marinaDropoff,
  );
  return results;
}

export function chargeToMetadata(charge: ChargeBreakdown) {
  return {
    fare: String(charge.fare),
    gratuity_pct: String(charge.gratuityPct),
    gratuity: String(charge.gratuity),
    total: String(charge.total),
    owner: String(charge.owner),
    captain: String(charge.captain),
    captain_total: String(charge.captainTotal),
    platform: String(charge.platform),
    marina_pickup: String(charge.marina.origin),
    marina_dropoff: String(charge.marina.destination),
    marina_total: String(charge.marina.total),
  };
}
