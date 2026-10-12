import { isPhotoStore, type PhotoStore } from "@/lib/photos/keys";

// Keep the installed clients' keys. Old entries have no owner; they must never
// acquire the next signed-in account just because the device was wiped.
const DELETE_QUEUE_KEY = "mibebe.photos.deleteQueue";
const DELETE_ALL_KEY = "mibebe.photos.deleteAllPending";
const UNKNOWN_OWNER_KEY = "mibebe.photos.legacyUnidentified";

export interface QueuedPhotoDelete {
  store: PhotoStore;
  recordId: string;
  accountId?: string;
}

function owner(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readPhotoDeleteQueue(): QueuedPhotoDelete[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) =>
      item && isPhotoStore(item.store) && typeof item.recordId === "string"
        ? [{ store: item.store, recordId: item.recordId, accountId: owner(item.accountId) }]
        : [],
    );
  } catch {
    return [];
  }
}

export function writePhotoDeleteQueue(queue: QueuedPhotoDelete[]): void {
  if (queue.length === 0) localStorage.removeItem(DELETE_QUEUE_KEY);
  else localStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(queue));
}

/** Null means a legacy obligation whose original account is still unknown. */
export function readPhotoDeleteAllOwners(): (string | null)[] {
  try {
    const raw = localStorage.getItem(DELETE_ALL_KEY);
    if (raw === "1") return [null];
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((item): item is string | null => item === null || owner(item) !== undefined))]
      : [];
  } catch {
    return [];
  }
}

export function writePhotoDeleteAllOwners(owners: (string | null)[]): void {
  if (owners.length === 0) localStorage.removeItem(DELETE_ALL_KEY);
  else localStorage.setItem(DELETE_ALL_KEY, JSON.stringify([...new Set(owners)]));
}

/** Call BEFORE replacing the original IndexedDB account link, never at login. */
export function preserveLegacyPhotoDeletionOwner(accountId: string | undefined): void {
  if (typeof localStorage === "undefined") return;
  const queue = readPhotoDeleteQueue();
  const owners = readPhotoDeleteAllOwners();
  if (!accountId) {
    // Once the original link is absent, a later adoption cannot identify it.
    if (queue.some((item) => !item.accountId) || owners.includes(null)) {
      localStorage.setItem(UNKNOWN_OWNER_KEY, "1");
    }
    return;
  }
  if (localStorage.getItem(UNKNOWN_OWNER_KEY) === "1") return;
  if (queue.some((item) => !item.accountId)) {
    writePhotoDeleteQueue(queue.map((item) => ({ ...item, accountId: item.accountId ?? accountId })));
  }
  if (owners.includes(null)) {
    writePhotoDeleteAllOwners(owners.map((item) => item ?? accountId));
  }
}

/** Only after the server has confirmed this account and its photo objects gone. */
export function forgetDeletedAccountPhotoJobs(accountId: string): void {
  writePhotoDeleteQueue(readPhotoDeleteQueue().filter(job => job.accountId !== accountId));
  writePhotoDeleteAllOwners(readPhotoDeleteAllOwners().filter(owner => owner !== accountId));
}
