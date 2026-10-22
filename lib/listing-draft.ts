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
