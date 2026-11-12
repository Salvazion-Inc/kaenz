import {
  listingHinDecision,
  optionalWallet,
  parseLangs,
  parseTraits,
  type CaptainLang,
  type YachtListing,
  type YachtTrait,
} from "./listings";

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

/** Same ownership rule as delete: only the creator, and only while it is a draft. */
export function draftUpdateDecision(
  row: { createdBy: string; status: string } | null | undefined,
  userId: string,
): "update" | "missing" | "forbidden" {
  const decision = draftDeleteDecision(row, userId);
  return decision === "delete" ? "update" : decision;
}

/**
 * Inserted listings stay unpublished until the caller explicitly lists them.
 * DEC-20261112-02. A missing status used to publish the yacht.
 */
export function listingInsertStatus(status: unknown): "draft" | "listed" {
  return status === "listed" ? "listed" : "draft";
}

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type YachtDraftRecord = YachtListing & {
  ownerIdUrl: string;
  captainIdUrl: string;
  captainMmcUrl: string;
};

export type YachtDraftDocuments = {
  ownerId: boolean;
  captainId: boolean;
  captainMmc: boolean;
  captainPhoto: boolean;
};

/** What the owner sees when resuming a draft. Private files are flags, never paths. */
export type YachtDraftResume = {
  id: string;
  name: string;
  homePort: string;
  ownerName: string;
  ownerWallet: string;
  captainName: string;
  captainWallet: string;
  captainRegion: string;
  captainLanguages: CaptainLang[];
  hin: string;
  guests: number;
  traits: YachtTrait[];
  photos: string[];
  captainPhoto: string;
  documents: YachtDraftDocuments;
  status: "draft";
};

export type YachtDraftPatch = {
  ownerName: string;
  ownerWallet: string;
  name: string;
  hin: string;
  guests: number | null;
  traits: YachtTrait[];
  homePort: string;
  captainName: string;
  captainLanguages: CaptainLang[];
  captainRegion: string;
  captainWallet: string;
  ownerIdUrl: string;
  captainIdUrl: string;
  captainMmcUrl: string;
  captainPhoto: string;
  photos: string[];
  status: "draft" | "listed";
};

export function isPublicAssetUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Keep saved photos, then append new ones. Never drop or replace an existing photo. */
export function mergeDraftPhotos(existing: string[], incoming: string[], max = 5) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const url of [...existing, ...incoming]) {
    const value = String(url || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/** Next `yacht-N` index that will not overwrite a photo already stored on the draft. */
export function nextYachtPhotoIndex(photos: string[]) {
  const kept = photos.map((photo) => String(photo || "").trim()).filter(Boolean);
  let next = 0;
  for (const photo of kept) {
    const match = /yacht-([0-4])\./i.exec(photo);
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }
  if (next < kept.length) next = kept.length;
  return Math.min(next, 5);
}

export function mergeYachtDraft(
  existing: YachtDraftRecord | null,
  patch: YachtDraftPatch,
  id: string,
  createdBy: string,
): YachtDraftRecord {
  return {
    id,
    slug: existing?.slug || "",
    createdBy: existing?.createdBy || createdBy,
    status: patch.status,
    ownerName: patch.ownerName,
    ownerWallet: patch.ownerWallet,
    name: patch.name,
    hin: patch.hin,
    guests: patch.guests ?? existing?.guests ?? 1,
    traits: patch.traits,
    homePort: patch.homePort,
    photos: mergeDraftPhotos(existing?.photos || [], patch.photos),
    captainName: patch.captainName,
    captainPhoto: patch.captainPhoto || existing?.captainPhoto || "",
    captainLanguages: patch.captainLanguages,
    captainRegion: patch.captainRegion || existing?.captainRegion || "",
    captainWallet: patch.captainWallet,
    createdAt: existing?.createdAt || "",
    ownerIdUrl: patch.ownerIdUrl || existing?.ownerIdUrl || "",
    captainIdUrl: patch.captainIdUrl || existing?.captainIdUrl || "",
    captainMmcUrl: patch.captainMmcUrl || existing?.captainMmcUrl || "",
  };
}

/** List only when publishing, papers are complete, and the HIN is a real hull ID. */
export function listingPublishDecision(opts: {
  publish: boolean;
  missing: readonly string[];
  hinInvalid: boolean;
  hin: string;
}): "draft" | "listed" {
  if (!opts.publish || opts.missing.length > 0 || opts.hinInvalid || !opts.hin) return "draft";
  return "listed";
}

export function missingDraftSlots(row: {
  ownerIdUrl: string;
  captainIdUrl: string;
  captainMmcUrl: string;
  captainPhoto: string;
  photos: string[];
}) {
  const present: string[] = [];
  if (row.ownerIdUrl) present.push("owner_id");
  if (row.captainIdUrl) present.push("captain_id");
  if (row.captainMmcUrl) present.push("captain_mmc");
  if (row.captainPhoto) present.push("captain_photo");
  if (row.photos.length) present.push("yacht_0");
  return missingPublishDocuments(present);
}

export function toYachtDraftResume(row: YachtDraftRecord): YachtDraftResume {
  return {
    id: row.id,
    name: row.name,
    homePort: row.homePort,
    ownerName: row.ownerName,
    ownerWallet: row.ownerWallet,
    captainName: row.captainName,
    captainWallet: row.captainWallet,
    captainRegion: row.captainRegion,
    captainLanguages: row.captainLanguages,
    hin: row.hin,
    guests: row.guests,
    traits: row.traits,
    photos: row.photos.filter(isPublicAssetUrl),
    captainPhoto: isPublicAssetUrl(row.captainPhoto) ? row.captainPhoto : "",
    documents: {
      ownerId: Boolean(row.ownerIdUrl),
      captainId: Boolean(row.captainIdUrl),
      captainMmc: Boolean(row.captainMmcUrl),
      captainPhoto: Boolean(row.captainPhoto),
    },
    status: "draft",
  };
}

export type DraftStoredFiles = {
  owner_id: string;
  captain_id: string;
  captain_mmc: string;
  captain_photo: string;
  yacht_photos: string[];
};

/** Lenient save: a name is enough, and a bad HIN is dropped instead of blocking. */
export function parseYachtDraftSave(input: unknown) {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const built = buildYachtDraft({
    name: record.name,
    homePort: record.home_port,
    ownerName: record.owner_name,
    captainName: record.captain_name,
  });
  if (!built.ok) return built;
  const hinDecision = listingHinDecision(record.hin);
  const guestsNum = Number(record.guests);
  const guests =
    Number.isFinite(guestsNum) && guestsNum >= 1 && guestsNum <= 50 ? Math.round(guestsNum) : null;
  const listingId = String(record.listingId || "");
  if (listingId && !LISTING_ID.test(listingId)) return { ok: false as const, error: "fields" as const };
  const filesRaw =
    record.files && typeof record.files === "object"
      ? (record.files as Record<string, unknown>)
      : {};
  const yachtPhotos = Array.isArray(filesRaw.yacht_photos)
    ? filesRaw.yacht_photos.map((item) => String(item || "")).filter(Boolean)
    : [];
  return {
    ok: true as const,
    listingId,
    name: built.name,
    ownerName: built.ownerName,
    captainName: built.captainName,
    homePort: built.homePort,
    hin: hinDecision.hin,
    hinInvalid: hinDecision.warn,
    guests,
    traits: parseTraits(record.traits),
    captainLanguages: parseLangs(record.languages ?? record.captain_languages),
    captainRegion: clip(record.captain_region, 80),
    ownerWallet: optionalWallet(record.owner_wallet),
    captainWallet: optionalWallet(record.captain_wallet),
    files: {
      owner_id: String(filesRaw.owner_id || ""),
      captain_id: String(filesRaw.captain_id || ""),
      captain_mmc: String(filesRaw.captain_mmc || ""),
      captain_photo: String(filesRaw.captain_photo || ""),
      yacht_photos: yachtPhotos,
    } satisfies DraftStoredFiles,
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
