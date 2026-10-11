import Stripe from "stripe";
import type { ChargeBreakdown } from "./pricing";
import {
  fetchTransfersStatus,
  getPartnerAccount,
  recordPending,
  type PayoutRole,
  type TripPartners,
} from "./payouts";

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

export type TripShareResult = {
  role: PayoutRole;
  amount: number;
  id?: string;
  destination?: string;
  skipped?: "zero" | "pending";
  reason?: string;
};

/**
 * Pays each partner's share of a paid trip into that partner's own connected
 * account (separate charges and transfers). Kaenz keeps the remainder.
 * A share whose partner is missing or not active stays on the platform balance
 * and is recorded in pending_payouts; there is no fixed fallback account.
 */
export async function transferTripShares(opts: {
  stripe: Stripe;
  charge: ChargeBreakdown;
  transferGroup: string;
  bookingId: string;
  sourceCharge: string;
  partners: TripPartners;
}) {
  const { stripe, charge, transferGroup, bookingId, sourceCharge, partners } =
    opts;
  const results: TripShareResult[] = [];
  const statusCache = new Map<string, { accountId: string; active: boolean }>();

  async function accountFor(userId: string) {
    if (!userId) return { accountId: "", active: false, reason: "no_partner" };
    const cached = statusCache.get(userId);
    if (cached) return { ...cached, reason: cached.active ? "" : "not_ready" };
    const account = await getPartnerAccount(userId);
    if (!account) return { accountId: "", active: false, reason: "not_connected" };
    // Re-check capability status right before moving money.
    const status = await fetchTransfersStatus(
      stripe,
      account.accountId,
      account.api,
    ).catch(() => "pending" as const);
    const entry = { accountId: account.accountId, active: status === "active" };
    statusCache.set(userId, entry);
    return { ...entry, reason: entry.active ? "" : "not_ready" };
  }

  async function keep(role: PayoutRole, amount: number, reason: string) {
    const partner = partners[role];
    await recordPending({
      bookingId,
      role,
      partnerUserId: partner.userId,
      listingRef: partner.ref,
      amountCents: amount,
      transferGroup,
      sourceCharge,
      reason,
    });
    results.push({ role, amount, skipped: "pending", reason });
  }

  async function send(role: PayoutRole, amount: number) {
    if (amount <= 0) {
      results.push({ role, amount, skipped: "zero" });
      return;
    }
    const target = await accountFor(partners[role].userId);
    if (!target.active || !target.accountId) {
      await keep(role, amount, target.reason || "not_ready");
      return;
    }
    try {
      const transfer = await stripe.transfers.create(
        {
          amount,
          currency: "usd",
          destination: target.accountId,
          transfer_group: transferGroup,
          ...(sourceCharge ? { source_transaction: sourceCharge } : {}),
          metadata: { role, booking_id: bookingId },
        },
        { idempotencyKey: `kaenz_${bookingId}_${role}` },
      );
      results.push({
        role,
        amount,
        id: transfer.id,
        destination: target.accountId,
      });
    } catch {
      await keep(role, amount, "transfer_failed");
    }
  }

  await send("owner", charge.ownerCents);
  await send("captain", charge.captainTotalCents);
  await send("marina_pickup", charge.marinaOriginCents);
  await send("marina_dropoff", charge.marinaDestCents);
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

/** Display-only. Never echo a full Stripe id to a guest receipt. */
export function maskStripeId(id: string) {
  const value = String(id || "").trim();
  if (!value) return "";
  if (value.length <= 12) return "••••";
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}
