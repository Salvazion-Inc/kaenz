import { listingOwnerPrefix } from "./listing-files";

export const LISTING_STORAGE_BUCKETS = ["kaenz-docs", "kaenz-listings"] as const;

export type YachtListingStatus = "listed" | "draft" | "unpublished";

const YACHT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function listingStatus(value: unknown): YachtListingStatus {
  if (value === "draft" || value === "unpublished") return value;
  return "listed";
}

/** Public fleet reads only `listed`. Missing status is legacy catalog data. */
export function isPublicListingStatus(value: unknown) {
  return value == null || value === "" || value === "listed";
}

export function canManageListing(actorId: string, createdBy: string | null | undefined) {
  return Boolean(actorId) && actorId === createdBy;
}

export type ListingStorageTarget = {
  bucket: (typeof LISTING_STORAGE_BUCKETS)[number];
  folder: string;
};

/** Both buckets: kaenz-docs/<owner>/<yachtId> and kaenz-listings/<owner>/<yachtId>. */
export function listingStorageTargets(userId: string, yachtId: string): ListingStorageTarget[] {
  if (!userId || !YACHT_ID.test(yachtId)) throw new Error("fields");
  const folder = `${listingOwnerPrefix(userId)}/${yachtId}`;
  return LISTING_STORAGE_BUCKETS.map((bucket) => ({ bucket, folder }));
}

export type StorageEntry = {
  name?: string | null;
  id?: string | null;
  metadata?: unknown;
};

/** Names that can be deleted under a yacht folder. Rejects traversal. */
export function filesInListingFolder(folder: string, entries: StorageEntry[]) {
  const files: string[] = [];
  const folders: string[] = [];
  for (const entry of entries) {
    const name = String(entry.name || "");
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(name)) continue;
    const path = `${folder}/${name}`;
    if (entry.id == null && entry.metadata == null) folders.push(path);
    else files.push(path);
  }
  return { files, folders };
}
