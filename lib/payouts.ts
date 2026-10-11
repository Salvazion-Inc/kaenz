import type Stripe from "stripe";
import { getSupabaseAdmin } from "./supabase";

/**
 * Per-partner Stripe Connect payouts.
 *
 * Model (Stripe Connect marketplace, separate charges and transfers):
 * - Kaenz (platform) is the merchant of record and charges the full trip.
 * - Each partner (yacht owner, captain, pickup/dropoff marina) has their own
 *   connected account (Accounts v2, dashboard "express", recipient configuration
 *   with stripe_balance.stripe_transfers; fees and losses owned by the platform).
 * - After payment, each share is transferred to that partner's account with
 *   transfer_group + source_transaction. Kaenz keeps the remainder (25%).
 * - A share whose partner has not connected (or is not active yet) stays on the
 *   platform balance and is recorded in pending_payouts. It is released when the
 *   partner's account becomes active. There is never a fixed fallback account.
 */

export type PayoutRole = "owner" | "captain" | "marina_pickup" | "marina_dropoff";

export type TransfersStatus = "active" | "pending" | "restricted" | "unsupported" | "none";

export type PartnerAccount = {
  userId: string;
  accountId: string;
  api: "v2" | "v1";
  status: TransfersStatus;
  country: string;
};

export const PAYOUT_COUNTRIES = [
  "US", "ES", "FR", "IT", "GR", "HR", "PT", "MT", "CY", "DE", "NL", "BE",
  "IE", "GB", "CH", "SE", "DK", "NO", "FI", "AT", "PL", "SI", "MX", "CA",
] as const;

export function parseCountry(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return (PAYOUT_COUNTRIES as readonly string[]).includes(code) ? code : "";
}

function isAccountId(value: unknown) {
  return /^acct_[A-Za-z0-9]+$/.test(String(value || ""));
}

/* ------------------------------------------------------------------ store */

type AccountRow = {
  user_id: string;
  stripe_account_id: string;
  api: string | null;
  transfers_status: string | null;
  country: string | null;
};

function fromRow(row: AccountRow): PartnerAccount {
  const status = String(row.transfers_status || "pending") as TransfersStatus;
  return {
    userId: row.user_id,
    accountId: row.stripe_account_id,
    api: row.api === "v1" ? "v1" : "v2",
    status,
    country: row.country || "",
  };
}

export async function getPartnerAccount(userId: string): Promise<PartnerAccount | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return null;
  try {
    const { data, error } = await admin
      .from("partner_payout_accounts")
      .select("user_id, stripe_account_id, api, transfers_status, country")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return fromRow(data as AccountRow);
  } catch {
    return null;
  }
}

async function savePartnerAccount(row: PartnerAccount) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase");
  const { error } = await admin.from("partner_payout_accounts").upsert(
    {
      user_id: row.userId,
      stripe_account_id: row.accountId,
      api: row.api,
      transfers_status: row.status,
      country: row.country || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("payout_store");
}

/* ----------------------------------------------------------- stripe side */

async function createConnectedAccount(
  stripe: Stripe,
  user: { id: string; email: string; name: string },
  country: string,
): Promise<{ accountId: string; api: "v2" | "v1" }> {
  try {
    const account = await stripe.v2.core.accounts.create({
      contact_email: user.email || undefined,
      display_name: user.name || undefined,
      dashboard: "express",
      identity: country ? { country } : undefined,
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      metadata: { kaenz_user_id: user.id },
    } as Stripe.V2.Core.AccountCreateParams);
    return { accountId: account.id, api: "v2" };
  } catch (err) {
    // Fallback for platforms not yet enabled for Accounts v2: v1 controller
    // properties equivalent to the marketplace configuration above.
    const fallback = await stripe.accounts.create({
      email: user.email || undefined,
      country: country || undefined,
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        stripe_dashboard: { type: "express" },
        requirement_collection: "stripe",
      },
      capabilities: { transfers: { requested: true } },
      ...(country && country !== "US"
        ? { tos_acceptance: { service_agreement: "recipient" } }
        : {}),
      metadata: { kaenz_user_id: user.id },
    });
    void err;
    return { accountId: fallback.id, api: "v1" };
  }
}

export async function fetchTransfersStatus(
  stripe: Stripe,
  accountId: string,
  api: "v2" | "v1",
): Promise<TransfersStatus> {
  if (!isAccountId(accountId)) return "none";
  if (api === "v2") {
    try {
      const account = await stripe.v2.core.accounts.retrieve(accountId, {
        include: ["configuration.recipient"],
      });
      const status =
        account.configuration?.recipient?.capabilities?.stripe_balance
          ?.stripe_transfers?.status;
      return (status as TransfersStatus) || "pending";
    } catch {
      /* fall through to v1 view of the same acct_ id */
    }
  }
  const account = await stripe.accounts.retrieve(accountId);
  const transfers = account.capabilities?.transfers;
  if (transfers === "active") return "active";
  if (transfers === "inactive") return "restricted";
  return "pending";
}

/** Creates (or reuses) the partner's connected account and returns an onboarding URL. */
export async function startOnboarding(opts: {
  stripe: Stripe;
  user: { id: string; email: string; name: string };
  country: string;
  returnUrl: string;
  refreshUrl: string;
}) {
  const { stripe, user, returnUrl, refreshUrl } = opts;
  let account = await getPartnerAccount(user.id);
  if (!account) {
    const created = await createConnectedAccount(stripe, user, opts.country);
    account = {
      userId: user.id,
      accountId: created.accountId,
      api: created.api,
      status: "pending",
      country: opts.country,
    };
    await savePartnerAccount(account);
  }

  const status = await fetchTransfersStatus(stripe, account.accountId, account.api);
  if (status !== account.status) {
    account = { ...account, status };
    await savePartnerAccount(account).catch(() => undefined);
  }

  // An active account is managed in its own Express dashboard (Stripe
  // authenticates the account holder there). Onboarding links are only issued
  // while the account is not active yet.
  if (status === "active") {
    const login = await stripe.accounts.createLoginLink(account.accountId);
    return { url: login.url, status };
  }

  if (account.api === "v2") {
    try {
      const link = await stripe.v2.core.accountLinks.create({
        account: account.accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: refreshUrl,
            return_url: returnUrl,
          },
        },
      });
      return { url: link.url, status };
    } catch {
      /* fall back to the v1 Account Link for the same account */
    }
  }
  const link = await stripe.accountLinks.create({
    account: account.accountId,
    type: "account_onboarding",
    refresh_url: refreshUrl,
    return_url: returnUrl,
  });
  return { url: link.url, status };
}

/** Refreshes the stored capability status and releases pending shares when active. */
export async function refreshPartner(stripe: Stripe, userId: string) {
  const account = await getPartnerAccount(userId);
  if (!account) {
    return { status: "none" as TransfersStatus, released: 0, pendingCents: await pendingCentsFor(userId) };
  }
  const status = await fetchTransfersStatus(stripe, account.accountId, account.api);
  if (status !== account.status) {
    await savePartnerAccount({ ...account, status }).catch(() => undefined);
  }
  let released = 0;
  if (status === "active") {
    released = await releasePending(stripe, userId, account.accountId);
  }
  return { status, released, pendingCents: await pendingCentsFor(userId) };
}

/** Same as refreshPartner, keyed by connected account id (account.updated webhook). */
export async function refreshByAccountId(stripe: Stripe, accountId: string) {
  const admin = getSupabaseAdmin();
  if (!admin || !isAccountId(accountId)) return;
  const { data } = await admin
    .from("partner_payout_accounts")
    .select("user_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (data?.user_id) await refreshPartner(stripe, String(data.user_id));
}

/* --------------------------------------------------------- trip partners */

export type TripPartners = Record<PayoutRole, { userId: string; ref: string }>;

/**
 * Who gets each share of a trip: the yacht listing's owner/captain and the
 * partner who listed each marina/port. Seed catalog yachts and catalog places
 * without a Kaenz partner resolve to an empty userId (share stays pending).
 */
export async function resolveTripPartners(opts: {
  yachtId: string;
  originId: string;
  destinationId: string;
}): Promise<TripPartners> {
  const empty = (ref: string) => ({ userId: "", ref });
  const out: TripPartners = {
    owner: empty(opts.yachtId),
    captain: empty(opts.yachtId),
    marina_pickup: empty(opts.originId),
    marina_dropoff: empty(opts.destinationId),
  };
  const admin = getSupabaseAdmin();
  if (!admin) return out;

  const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

  if (opts.yachtId) {
    try {
      const column = isUuid(opts.yachtId) ? "id" : "slug";
      let row: Record<string, unknown> | null = null;
      const full = await admin
        .from("yacht_listings")
        .select("created_by, owner_user_id, captain_user_id")
        .eq(column, opts.yachtId)
        .maybeSingle();
      if (!full.error) row = full.data;
      else {
        const basic = await admin
          .from("yacht_listings")
          .select("created_by")
          .eq(column, opts.yachtId)
          .maybeSingle();
        row = basic.data;
      }
      if (row) {
        const createdBy = String(row.created_by || "");
        out.owner.userId = String(row.owner_user_id || createdBy);
        out.captain.userId = String(row.captain_user_id || createdBy);
      } else {
        const seed = await admin
          .from("yachts")
          .select("owner_id")
          .eq("slug", opts.yachtId)
          .maybeSingle();
        out.owner.userId = String(seed.data?.owner_id || "");
      }
    } catch {
      /* unresolved shares stay pending */
    }
  }

  async function placeUser(id: string) {
    if (!id) return "";
    try {
      const column = isUuid(id) ? "id" : "slug";
      const { data } = await admin!
        .from("marina_listings")
        .select("created_by")
        .eq(column, id)
        .maybeSingle();
      return String(data?.created_by || "");
    } catch {
      return "";
    }
  }
  out.marina_pickup.userId = await placeUser(opts.originId);
  out.marina_dropoff.userId = await placeUser(opts.destinationId);
  return out;
}

/* ------------------------------------------------------- pending shares */

export async function recordPending(row: {
  bookingId: string;
  role: PayoutRole;
  partnerUserId: string;
  listingRef: string;
  amountCents: number;
  transferGroup: string;
  sourceCharge: string;
  reason: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  try {
    const { error } = await admin.from("pending_payouts").upsert(
      {
        booking_id: row.bookingId,
        role: row.role,
        partner_user_id: row.partnerUserId || null,
        listing_ref: row.listingRef || null,
        amount_cents: row.amountCents,
        currency: "usd",
        transfer_group: row.transferGroup,
        source_charge: row.sourceCharge || null,
        reason: row.reason,
        status: "pending",
      },
      { onConflict: "booking_id,role", ignoreDuplicates: true },
    );
    return !error;
  } catch {
    return false;
  }
}

async function pendingCentsFor(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return 0;
  try {
    const { data } = await admin
      .from("pending_payouts")
      .select("amount_cents")
      .eq("partner_user_id", userId)
      .eq("status", "pending");
    return (data || []).reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  } catch {
    return 0;
  }
}

async function releasePending(stripe: Stripe, userId: string, accountId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const { data } = await admin
    .from("pending_payouts")
    .select("id, booking_id, role, amount_cents, currency, transfer_group, source_charge")
    .eq("partner_user_id", userId)
    .eq("status", "pending")
    .limit(50);
  let released = 0;
  for (const row of data || []) {
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Number(row.amount_cents),
          currency: String(row.currency || "usd"),
          destination: accountId,
          transfer_group: String(row.transfer_group),
          ...(row.source_charge ? { source_transaction: String(row.source_charge) } : {}),
          metadata: {
            role: String(row.role),
            booking_id: String(row.booking_id),
            pending_payout_id: String(row.id),
          },
        },
        { idempotencyKey: `kaenz_pending_${row.id}` },
      );
      await admin
        .from("pending_payouts")
        .update({
          status: "paid",
          stripe_transfer_id: transfer.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "pending");
      released += 1;
    } catch {
      /* stays pending; retried on the next refresh */
    }
  }
  return released;
}
