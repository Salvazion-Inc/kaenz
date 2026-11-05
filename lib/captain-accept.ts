/**
 * Captain acceptance gate for Stripe checkout.
 * DEC-20261105-01 under DEC-20261021-02. GOV-PASS-DEC20261105-01-plan.
 *
 * CAPTAIN_AUTO_ACCEPT is server-only. Unset, "0", and any value other than
 * "1" or "true" refuses checkout until trip_offers has a real captain accept.
 * "1" or "true" restores the previous auto-accept path.
 */

export const OFFER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OfferStatus = "offered" | "accepted" | "declined";

export type StoredOffer = {
  id: string;
  userId: string;
  customerName: string;
  yachtId: string;
  originName: string;
  destName: string;
  guests: number;
  kind: string;
  hours: number;
  status: OfferStatus;
  acceptedBy: string;
  acceptedAt: string;
};

export function captainAutoAcceptEnabled(env: NodeJS.ProcessEnv = process.env) {
  const raw = String(env.CAPTAIN_AUTO_ACCEPT ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true";
}

export function isCaptainRole(role: unknown) {
  const value = String(role || "")
    .trim()
    .toLowerCase();
  return value === "captain" || value === "both";
}

export function offerIsAccepted(
  row: Pick<StoredOffer, "status" | "acceptedBy" | "acceptedAt" | "yachtId"> | null,
) {
  if (!row) return false;
  return (
    row.status === "accepted" &&
    row.acceptedBy.trim().length > 0 &&
    row.acceptedAt.trim().length > 0 &&
    row.yachtId.trim().length > 0
  );
}

/** Fail closed. A checkout is allowed only for the customer on that accepted offer. */
export function acceptanceAllowsCheckout(
  row: StoredOffer | null,
  payerUserId: string,
  yachtId: string,
) {
  if (!row) return false;
  if (!payerUserId || row.userId !== payerUserId) return false;
  if (!offerIsAccepted(row)) return false;
  if (!yachtId || row.yachtId !== yachtId) return false;
  return true;
}

export function mapOfferRow(row: Record<string, unknown> | null): StoredOffer | null {
  if (!row) return null;
  const status = String(row.status || "");
  if (status !== "offered" && status !== "accepted" && status !== "declined") {
    return null;
  }
  const id = String(row.id || "");
  if (!OFFER_ID.test(id)) return null;
  return {
    id,
    userId: String(row.user_id || ""),
    customerName: String(row.customer_name || ""),
    yachtId: String(row.yacht_id || ""),
    originName: String(row.origin_name || ""),
    destName: String(row.dest_name || ""),
    guests: Number(row.guests) || 0,
    kind: String(row.kind || ""),
    hours: Number(row.hours) || 0,
    status,
    acceptedBy: String(row.accepted_by || ""),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : "",
  };
}
