import { isHin, optionalWallet, parseLangs, parseTraits } from "./listings";

/** Per-file cap. Matches the Supabase bucket fileSizeLimit used for listings. */
export const LISTING_MAX_BYTES = 8 * 1024 * 1024;

/**
 * PDFs and other non-images are uploaded as-is, so an over-cap file must fail
 * before the request. Photos may still be compressed under the cap.
 */
export function rawListingFileTooBig(file: { size: number; type?: string; name?: string }) {
  if (!Number.isFinite(file.size) || file.size <= LISTING_MAX_BYTES) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const image =
    type.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp");
  return !image;
}

/**
 * Vercel rejects a serverless request before the function runs when the body
 * is over ~4.5 MB, with a plain-text "Request Entity Too Large" body
 * (x-vercel-error: FUNCTION_PAYLOAD_TOO_LARGE).
 */
export const VERCEL_FUNCTION_BODY_LIMIT = Math.floor(4.5 * 1024 * 1024);

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ListingFileKind = "photo" | "doc";

export type PreparedListingFile = {
  slot: string;
  name: string;
  type: string;
  size: number;
  ext: "jpg" | "png" | "webp" | "pdf";
  base: string;
  kind: ListingFileKind;
  allowPdf: boolean;
  error: string;
};

export type ListingStoredFiles = {
  owner_id: string;
  captain_id: string;
  captain_mmc: string;
  captain_photo: string;
  yacht_photos: string[];
};

const CLIENT_FILE_ERRORS = new Set([
  "fields",
  "hin",
  "guests",
  "traits",
  "languages",
  "owner_id",
  "captain_id",
  "mmc",
  "captain_photo",
  "photos",
  "file_too_big",
  "upload",
]);

export function isListingClientError(code: string) {
  return CLIENT_FILE_ERRORS.has(code);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable, path-safe owner prefix. Session ids may contain ":" (google:…). */
export function listingOwnerPrefix(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type SlotSpec = {
  base: string;
  kind: ListingFileKind;
  allowPdf: boolean;
  error: string;
};

function slotSpec(slot: string): SlotSpec | null {
  if (slot === "owner_id") {
    return { base: "owner-id", kind: "doc", allowPdf: false, error: "owner_id" };
  }
  if (slot === "captain_id") {
    return { base: "captain-id", kind: "doc", allowPdf: true, error: "captain_id" };
  }
  if (slot === "captain_mmc") {
    return { base: "captain-mmc", kind: "doc", allowPdf: true, error: "mmc" };
  }
  if (slot === "captain_photo") {
    return { base: "captain-photo", kind: "photo", allowPdf: false, error: "captain_photo" };
  }
  const yacht = /^yacht_([0-4])$/.exec(slot);
  if (!yacht) return null;
  return { base: `yacht-${yacht[1]}`, kind: "photo", allowPdf: false, error: "photos" };
}

export function listingExt(name: string, type: string, allowPdf: boolean) {
  const lower = name.toLowerCase();
  const mime = type.toLowerCase();
  if (allowPdf && (mime === "application/pdf" || lower.endsWith(".pdf"))) return "pdf" as const;
  if (mime === "image/png" || lower.endsWith(".png")) return "png" as const;
  if (mime === "image/webp" || lower.endsWith(".webp")) return "webp" as const;
  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/pjpeg" ||
    /\.jpe?g$/i.test(lower)
  ) {
    return "jpg" as const;
  }
  return null;
}

export function validateListingFileSet(
  files: unknown,
): { ok: true; files: PreparedListingFile[] } | { ok: false; error: string } {
  if (!Array.isArray(files) || files.length > 9) return { ok: false, error: "photos" };
  const prepared: PreparedListingFile[] = [];
  const seen = new Set<string>();
  for (const raw of files) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "fields" };
    const row = raw as Record<string, unknown>;
    const slot = String(row.slot || "");
    const spec = slotSpec(slot);
    if (!spec) return { ok: false, error: "fields" };
    if (seen.has(slot)) return { ok: false, error: spec.error };
    seen.add(slot);
    const name = String(row.name || "upload");
    const type = String(row.type || "");
    const size = Number(row.size);
    if (!Number.isFinite(size) || size <= 0) return { ok: false, error: spec.error };
    if (size > LISTING_MAX_BYTES) return { ok: false, error: "file_too_big" };
    const ext = listingExt(name, type, spec.allowPdf);
    if (!ext) return { ok: false, error: spec.error };
    prepared.push({ slot, name, type, size, ext, ...spec });
  }
  if (!seen.has("owner_id")) return { ok: false, error: "owner_id" };
  if (!seen.has("captain_id")) return { ok: false, error: "captain_id" };
  if (!seen.has("captain_mmc")) return { ok: false, error: "mmc" };
  if (!seen.has("captain_photo")) return { ok: false, error: "captain_photo" };
  const yacht = [0, 1, 2, 3, 4].filter((index) => seen.has(`yacht_${index}`));
  if (!yacht.length || yacht.some((index, order) => index !== order)) {
    return { ok: false, error: "photos" };
  }
  const order = [
    "owner_id",
    "captain_id",
    "captain_mmc",
    "captain_photo",
    "yacht_0",
    "yacht_1",
    "yacht_2",
    "yacht_3",
    "yacht_4",
  ];
  prepared.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
  return { ok: true, files: prepared };
}

export function listingObjectPath(
  userId: string,
  listingId: string,
  base: string,
  ext: string,
) {
  if (!LISTING_ID.test(listingId)) throw new Error("fields");
  if (!/^[a-z0-9-]{1,40}$/.test(base)) throw new Error("fields");
  if (!/^(jpg|png|webp|pdf)$/.test(ext)) throw new Error("fields");
  return `${listingOwnerPrefix(userId)}/${listingId}/${base}.${ext}`;
}

export function isOwnedListingPath(
  userId: string,
  listingId: string,
  path: string,
  base: string,
  allowPdf: boolean,
) {
  if (!LISTING_ID.test(listingId)) return false;
  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return false;
  const ext = allowPdf ? "jpg|png|webp|pdf" : "jpg|png|webp";
  const re = new RegExp(
    `^${escapeReg(listingOwnerPrefix(userId))}/${listingId}/${escapeReg(base)}\\.(${ext})$`,
  );
  return re.test(path);
}

export function mimeMatchesExt(ext: string, mime: string) {
  const value = mime.toLowerCase().split(";")[0].trim();
  if (!value || value === "application/octet-stream") return true;
  if (ext === "jpg") return value === "image/jpeg" || value === "image/jpg" || value === "image/pjpeg";
  if (ext === "png") return value === "image/png";
  if (ext === "webp") return value === "image/webp";
  if (ext === "pdf") return value === "application/pdf";
  return false;
}

export function parseStoredListingBody(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const, error: "fields" };
  const body = input as Record<string, unknown>;
  const listingId = String(body.listingId || "");
  if (!LISTING_ID.test(listingId)) return { ok: false as const, error: "fields" };
  const ownerName = String(body.owner_name || "").trim();
  const name = String(body.name || "").trim();
  const hin = String(body.hin || "").trim();
  const guests = Number(body.guests);
  const traits = parseTraits(body.traits);
  const homePort = String(body.home_port || "").trim();
  const captainName = String(body.captain_name || "").trim();
  const captainLanguages = parseLangs(body.languages);
  const captainRegion = String(body.captain_region || "").trim();
  // Empty or invalid Solana wallets are stored as "" and never block listing.
  const ownerWallet = optionalWallet(body.owner_wallet);
  const captainWallet = optionalWallet(body.captain_wallet);
  const status = body.status === "draft" ? ("draft" as const) : ("listed" as const);
  if (!ownerName || !name || !captainName || !homePort || !captainRegion) {
    return { ok: false as const, error: "fields" };
  }
  if (!isHin(hin)) return { ok: false as const, error: "hin" };
  if (!Number.isFinite(guests) || guests < 1 || guests > 50) {
    return { ok: false as const, error: "guests" };
  }
  if (!traits.length) return { ok: false as const, error: "traits" };
  if (!captainLanguages.length) return { ok: false as const, error: "languages" };
  const filesRaw = body.files;
  if (!filesRaw || typeof filesRaw !== "object") return { ok: false as const, error: "photos" };
  const files = filesRaw as Record<string, unknown>;
  const stored: ListingStoredFiles = {
    owner_id: String(files.owner_id || ""),
    captain_id: String(files.captain_id || ""),
    captain_mmc: String(files.captain_mmc || ""),
    captain_photo: String(files.captain_photo || ""),
    yacht_photos: Array.isArray(files.yacht_photos)
      ? files.yacht_photos.map((item) => String(item || ""))
      : [],
  };
  return {
    ok: true as const,
    listingId,
    ownerName,
    ownerWallet,
    name,
    hin,
    guests,
    traits,
    homePort,
    captainName,
    captainLanguages,
    captainRegion,
    captainWallet,
    status,
    files: stored,
  };
}

export function assertListingPaths(userId: string, listingId: string, files: ListingStoredFiles) {
  const checks: Array<[string, string, boolean, string]> = [
    [files.owner_id, "owner-id", false, "owner_id"],
    [files.captain_id, "captain-id", true, "captain_id"],
    [files.captain_mmc, "captain-mmc", true, "mmc"],
    [files.captain_photo, "captain-photo", false, "captain_photo"],
  ];
  for (const [path, base, allowPdf, error] of checks) {
    if (!isOwnedListingPath(userId, listingId, path, base, allowPdf)) {
      return { ok: false as const, error };
    }
  }
  if (files.yacht_photos.length < 1 || files.yacht_photos.length > 5) {
    return { ok: false as const, error: "photos" };
  }
  for (let index = 0; index < files.yacht_photos.length; index += 1) {
    if (!isOwnedListingPath(userId, listingId, files.yacht_photos[index], `yacht-${index}`, false)) {
      return { ok: false as const, error: "photos" };
    }
  }
  return { ok: true as const };
}

export type SignedListingUpload = {
  slot: string;
  path: string;
  signedUrl: string;
};

export function directListingPayload(input: {
  listingId: string;
  owner_name: string;
  owner_wallet: string;
  name: string;
  hin: string;
  guests: string;
  traits: string;
  home_port: string;
  captain_name: string;
  languages: string;
  captain_region: string;
  captain_wallet: string;
  status?: string;
  uploads: Array<{ slot: string; path: string }>;
}) {
  const pathFor = (slot: string) => input.uploads.find((item) => item.slot === slot)?.path || "";
  const yachtPhotos = input.uploads
    .filter((item) => item.slot.startsWith("yacht_"))
    .sort((a, b) => a.slot.localeCompare(b.slot, "en"))
    .map((item) => item.path);
  return {
    listingId: input.listingId,
    owner_name: input.owner_name,
    owner_wallet: input.owner_wallet,
    name: input.name,
    hin: input.hin,
    guests: input.guests,
    traits: input.traits,
    home_port: input.home_port,
    captain_name: input.captain_name,
    languages: input.languages,
    captain_region: input.captain_region,
    captain_wallet: input.captain_wallet,
    status: input.status === "draft" ? "draft" : "listed",
    files: {
      owner_id: pathFor("owner_id"),
      captain_id: pathFor("captain_id"),
      captain_mmc: pathFor("captain_mmc"),
      captain_photo: pathFor("captain_photo"),
      yacht_photos: yachtPhotos,
    },
  };
}

/** Bytes the old single FormData POST would send through the Vercel function. */
export function multipartBodyBytes(
  parts: Array<{ name: string; filename?: string; type?: string; size?: number; value?: string }>,
  boundary = "----WebKitFormBoundaryKaenzListing",
) {
  let total = 0;
  for (const part of parts) {
    const disposition = part.filename
      ? `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.type || "application/octet-stream"}\r\n\r\n`
      : `Content-Disposition: form-data; name="${part.name}"\r\n\r\n`;
    total += byteLength(`--${boundary}\r\n${disposition}`);
    total += part.filename ? part.size || 0 : byteLength(part.value || "");
    total += 2;
  }
  total += byteLength(`--${boundary}--\r\n`);
  return total;
}

export function isSupabaseSignedUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.includes("/object/upload/sign/");
  } catch {
    return false;
  }
}

/**
 * Never throw on a non-JSON body. Vercel’s 413 is plain text starting with
 * "Request Entity Too Large", which JSON.parse reports as
 * Unexpected token 'R', "Request En"… is not valid JSON.
 */
export function classifyListingResponse(status: number, body: string) {
  const trimmed = body.trim();
  if (status === 413 || /^request entity too large\b/i.test(trimmed)) {
    return { error: "too_large" as const };
  }
  if (!trimmed) return { error: status >= 400 ? "http" : "empty" };
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    if (status >= 400) {
      return { error: typeof json.error === "string" && json.error ? json.error : "http" };
    }
    return {
      error: "",
      yacht: json.yacht,
      listingId: typeof json.listingId === "string" ? json.listingId : "",
      uploads: Array.isArray(json.uploads) ? json.uploads : [],
    };
  } catch {
    return { error: "http" };
  }
}
