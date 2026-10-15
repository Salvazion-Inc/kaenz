import { listingOwnerPrefix } from "./listing-files";

export const LISTING_STORAGE_BUCKETS = ["kaenz-docs", "kaenz-listings"] as const;

export type YachtListingStatus = "listed" | "draft" | "unlisted";

const YACHT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `unpublished` is the previous stored value and means the same as `unlisted`. */
export function listingStatus(value: unknown): YachtListingStatus {
  if (value === "draft") return "draft";
  if (value === "unlisted" || value === "unpublished") return "unlisted";
  return "listed";
}

/** Status an owner is allowed to write. Unknown values are rejected. */
export function managedListingStatus(value: unknown): YachtListingStatus | null {
  if (value === "listed" || value === "draft") return value;
  if (value === "unlisted" || value === "unpublished") return "unlisted";
  return null;
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

export type ListingStorageApi = {
  list: (bucket: string, folder: string, offset: number) => Promise<StorageEntry[] | null>;
  remove: (bucket: string, paths: string[]) => Promise<void>;
};

async function collectListingFiles(
  api: ListingStorageApi,
  bucket: string,
  folder: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 4) return [];
  const files: string[] = [];
  let offset = 0;
  for (;;) {
    const entries = await api.list(bucket, folder, offset);
    if (!entries?.length) break;
    const split = filesInListingFolder(folder, entries);
    files.push(...split.files);
    for (const child of split.folders) {
      files.push(...(await collectListingFiles(api, bucket, child, depth + 1)));
    }
    if (entries.length < 100) break;
    offset += entries.length;
  }
  return files;
}

/**
 * Removes every object under kaenz-docs/<owner>/<yachtId>, kaenz-listings/<owner>/<yachtId>,
 * and the legacy <yachtId>/ prefix in both buckets. Logs bucket/path only.
 */
export async function deleteListingStorageFiles(
  api: ListingStorageApi,
  userId: string,
  yachtId: string,
  write: (line: string) => void = (line) => {
    console.info(line);
  },
): Promise<string[]> {
  const targets: ListingStorageTarget[] = [
    ...listingStorageTargets(userId, yachtId),
    ...LISTING_STORAGE_BUCKETS.map((bucket) => ({ bucket, folder: yachtId })),
  ];
  const removed: string[] = [];
  for (const target of targets) {
    const paths = await collectListingFiles(api, target.bucket, target.folder);
    if (!paths.length) continue;
    await api.remove(target.bucket, paths);
    for (const path of paths) removed.push(`${target.bucket}/${path}`);
  }
  const safe = removed.filter(
    (path) =>
      /^kaenz-(docs|listings)\//.test(path) &&
      !/(secret|token|signedurl|service_role|apikey)/i.test(path),
  );
  write(`listing-storage-removed ${safe.join(" ")}`.trim());
  return safe;
}
