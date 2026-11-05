import { parseRole, type ProfileRole } from "./profile";

/**
 * DEC-20261105-01 / DEC-20261021-02 / GOV-FAIL-KNZ26-CODE.
 * Captain authority is captain_verified or yacht_listings.captain_user_id.
 * profiles.role is not authority: the account holder can write it.
 */

export type AssignedYacht = {
  id: string;
  slug: string;
};

export type CaptainEligibility = {
  verified: boolean;
  yachts: AssignedYacht[];
};

export function isEligibleCaptain(eligibility: CaptainEligibility) {
  return eligibility.verified || eligibility.yachts.length > 0;
}

function yachtKeys(yacht: AssignedYacht) {
  return [yacht.id, yacht.slug].map((value) => value.trim()).filter(Boolean);
}

export function yachtAssigned(yachts: AssignedYacht[], yachtId: string) {
  const wanted = yachtId.trim();
  if (!wanted) return false;
  return yachts.some((yacht) => yachtKeys(yacht).includes(wanted));
}

function sameAssignedYacht(yachts: AssignedYacht[], left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  return yachts.some((yacht) => {
    const keys = yachtKeys(yacht);
    return keys.includes(a) && keys.includes(b);
  });
}

export function roleAsksForCaptain(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return raw === "captain" || raw === "both";
}

/** Block /api/profile from persisting captain or both unless the server already verified it. */
export function gateProfileRole(input: {
  requested: unknown;
  current: ProfileRole;
  eligible: boolean;
}): { ok: true; role: ProfileRole } | { ok: false; status: 403; error: "captain" } {
  if (roleAsksForCaptain(input.requested)) {
    if (!input.eligible) return { ok: false, status: 403, error: "captain" };
    return { ok: true, role: "captain" };
  }
  const next = parseRole(
    input.requested === undefined || input.requested === null || input.requested === ""
      ? input.current
      : input.requested,
  );
  if (next === "captain" && !input.eligible) return { ok: true, role: "customer" };
  return { ok: true, role: next };
}

/**
 * Join applications stay pending and never write profiles.
 * A missing or unknown role does not become captain. "both" does not either.
 */
export function joinApplicationRole(value: unknown): "owner" | "captain" {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "captain") return "captain";
  return "owner";
}

export function decideCaptainOfferAction(input: {
  captainId: string;
  customerId: string;
  yachtId: string;
  offerYachtId: string;
  yachts: AssignedYacht[];
  kind: "accept" | "decline";
}):
  | { ok: true; yachtId: string }
  | { ok: false; status: 400 | 403; error: "captain" | "yacht" } {
  if (!input.captainId || input.captainId === input.customerId) {
    return { ok: false, status: 403, error: "captain" };
  }
  const offered = input.offerYachtId.trim();
  const requested = input.yachtId.trim();
  const yachtId = requested || offered;
  if (input.kind === "accept" && !yachtId) {
    return { ok: false, status: 400, error: "yacht" };
  }
  if (!yachtAssigned(input.yachts, yachtId)) {
    return {
      ok: false,
      status: 403,
      error: input.yachts.length ? "yacht" : "captain",
    };
  }
  if (offered && requested && !sameAssignedYacht(input.yachts, offered, requested)) {
    return { ok: false, status: 403, error: "yacht" };
  }
  return { ok: true, yachtId };
}
