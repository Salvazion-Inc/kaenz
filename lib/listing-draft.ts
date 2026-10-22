function clip(value: unknown, max = 80) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export function buildYachtDraft(input: {
  name: unknown;
  homePort?: unknown;
  ownerName?: unknown;
  captainName?: unknown;
}) {
  const name = clip(input.name);
  if (name.length < 2) return { ok: false as const, error: "fields" as const };
  const ownerName = clip(input.ownerName) || "Pending";
  return {
    ok: true as const,
    name,
    ownerName,
    captainName: clip(input.captainName) || ownerName,
    homePort: clip(input.homePort) || "Pending",
    status: "draft" as const,
    documents: "pending" as const,
  };
}

export type DraftAccess = "delete" | "missing" | "forbidden";

/** A draft can be removed only by the account that saved it. Listed yachts stay. */
export function draftDeleteDecision(
  row: { createdBy: string; status: string } | null | undefined,
  userId: string,
): DraftAccess {
  if (!row?.createdBy) return "missing";
  if (row.createdBy !== userId || row.status !== "draft") return "forbidden";
  return "delete";
}

export function missingPublishDocuments(present: Iterable<string>) {
  const have = new Set(present);
  const required = ["owner_id", "captain_id", "captain_mmc", "captain_photo", "yacht_0"] as const;
  return required.filter((slot) => !have.has(slot));
}

export function buildMarinaDraft(input: { name: unknown }) {
  const name = clip(input.name);
  if (name.length < 2) return { ok: false as const, error: "fields" as const };
  return {
    ok: true as const,
    name,
    status: "draft" as const,
    documents: "pending" as const,
  };
}
