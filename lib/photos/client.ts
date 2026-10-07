"use client";

import { db, notDeleted, PHOTO_BACKUP_STORES } from "@/lib/db";
import { accountHeaders, ensureAccountLink } from "@/lib/sync/client";
import {
  isAllowedContentType,
  isAllowedSize,
  MAX_PHOTO_BYTES,
  type PhotoStore,
} from "./keys";

// BUILD-PLAN K4 — opt-in photo backup, device side.
//
// The shape of one photo's round trip:
//
//   ask for a signed PUT → PUT the bytes straight to the bucket → confirm
//
// The bytes never pass through our server. That is not only a cost decision: a
// Hostinger Node process proxying 12 MB on a 3G upload is a request that times
// out, and a timed-out proxy upload is indistinguishable from a lost photo.
//
// **"Resumable-enough for 3G" means per-photo, not per-byte.** Real multipart
// resumability would be the right answer for video and is over-engineering for
// a 2 MB JPEG: what actually goes wrong on Paraguayan mobile data is that the
// connection dies partway through a *batch*. So each photo is confirmed on its
// own and marked `uploadedAt` locally, uploads run one at a time, and a run
// that dies resumes at the next unmarked photo rather than at zero. Stated
// plainly because it is a limitation somebody will otherwise assume away.
//
// The 2026-10 review added four rules on top:
//
// - F01: nothing here runs against an account this phone's data does not
//   belong to (`ensureAccountLink`, the same A6 rule ordinary sync uses), and
//   every request names the linked account so the server can refuse a cookie
//   that changed after the check.
// - F03: a deletion is a job, not a hope. Deletes and the opt-out's
//   "delete-all" are queued on the device and retried until the server
//   answers 200; a photo queued for deletion is never restored; a record
//   deleted elsewhere is never uploaded again.
// - N2: `uploadedAt` is a claim this device made once. It is checked against
//   the server's list on every run, so an opt-out from another device (which
//   deletes every copy) makes this one upload again instead of believing a
//   copy still exists.
// - F10: the run starts by itself — on app start and on reconnect — not only
//   when the switch is touched or a photo is added.

const URL_PATH = "/api/v1/photos";

export type PhotoBackupOutcome =
  | "ok"
  | "off"
  | "unavailable"
  | "offline"
  | "error"
  /** F01: this phone's data belongs to another account than the session's. */
  | "account-mismatch";

export interface PhotoBackupSummary {
  outcome: PhotoBackupOutcome;
  uploaded: number;
  restored: number;
  /** Photos still waiting to upload after this run. */
  pending?: number;
}

const NOTHING: PhotoBackupSummary = {
  outcome: "off",
  uploaded: 0,
  restored: 0,
};

// ---------------------------------------------------------------------------
// The preference
// ---------------------------------------------------------------------------

export async function isPhotoBackupOn(): Promise<boolean> {
  try {
    const profile = notDeleted(await db().profile.toArray())[0];
    return profile?.photoBackup === true;
  } catch {
    return false;
  }
}

async function writePreference(enabled: boolean): Promise<boolean> {
  try {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (first?.id) await db().profile.update(first.id, { photoBackup: enabled });
    return true;
  } catch {
    return false;
  }
}

export type PhotoBackupChange =
  /** Saved; for "off", every server copy is confirmed deleted. */
  | "done"
  /** Saved; the server copies are queued for deletion and retried. */
  | "pending"
  /** This phone's photos belong to another account: nothing was sent. */
  | "account-mismatch"
  /** The preference itself could not be stored. */
  | "failed";

/**
 * Turn backup on or off.
 *
 * Turning it **off deletes the server copies** — the task's own acceptance
 * criterion, and the only version of an opt-out worth having. The local flag is
 * written first so that a failed delete leaves the feature off rather than on:
 * the direction that fails safe is the one where nothing further is uploaded.
 *
 * F03: "off" no longer reports a deletion it did not get. A provider error (the
 * server now answers 503 with what is pending) or no signal leaves the
 * deletion queued, and every later run retries it until the server confirms.
 */
export async function setPhotoBackup(enabled: boolean): Promise<PhotoBackupChange> {
  if (!(await writePreference(enabled))) return "failed";
  if (enabled) return "done";

  const link = await ensureAccountLink();
  // F01: the copies on the server belong to the account this phone's data is
  // linked to. Signed in as somebody else, "delete-all" would erase THAT
  // person's photos. The preference is stored; nothing is sent.
  if (link.status === "mismatch") return "account-mismatch";

  setDeleteAllPending(true);
  if (link.status !== "linked") return "pending";
  return (await flushDeleteAll(link.accountId)) ? "done" : "pending";
}

async function clearUploadMarks(): Promise<void> {
  for (const store of PHOTO_BACKUP_STORES) {
    const table = db().table(store);
    for (const row of await table.toArray()) {
      if (
        (row.uploadedAt !== undefined || row.remoteDeletedAt !== undefined) &&
        row.id !== undefined
      ) {
        await table.update(row.id, { uploadedAt: undefined, remoteDeletedAt: undefined });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// F03 — deletions are queued until the server confirms them
// ---------------------------------------------------------------------------

/** `{ store, recordId }` pairs deleted on this phone, not yet confirmed. */
const DELETE_QUEUE_KEY = "mibebe.photos.deleteQueue";
/** Set while an opt-out's "delete every copy" is not yet confirmed. */
const DELETE_ALL_KEY = "mibebe.photos.deleteAllPending";

interface QueuedDelete {
  store: PhotoStore;
  recordId: string;
}

function readDeleteQueue(): QueuedDelete[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is QueuedDelete =>
            typeof item?.recordId === "string" &&
            (PHOTO_BACKUP_STORES as readonly string[]).includes(item?.store),
        )
      : [];
  } catch {
    return [];
  }
}

function writeDeleteQueue(queue: QueuedDelete[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(DELETE_QUEUE_KEY);
    else localStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage refused. The delete is still attempted now; only the retry is lost.
  }
}

function deleteAllPending(): boolean {
  try {
    return localStorage.getItem(DELETE_ALL_KEY) === "1";
  } catch {
    return false;
  }
}

function setDeleteAllPending(pending: boolean): void {
  try {
    if (pending) localStorage.setItem(DELETE_ALL_KEY, "1");
    else localStorage.removeItem(DELETE_ALL_KEY);
  } catch {
    // See writeDeleteQueue.
  }
}

/** How many deletions this phone has not had confirmed yet (for Ajustes). */
export function pendingPhotoDeletions(): number {
  return readDeleteQueue().length + (deleteAllPending() ? 1 : 0);
}

async function flushDeleteAll(accountId: string): Promise<boolean> {
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: accountHeaders(accountId),
      body: JSON.stringify({ action: "delete-all" }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  setDeleteAllPending(false);
  // Every local photo is now un-uploaded again, so re-enabling backup uploads
  // them rather than believing a server copy that no longer exists.
  await clearUploadMarks();
  return true;
}

async function flushDeletes(accountId: string): Promise<void> {
  if (deleteAllPending()) await flushDeleteAll(accountId);

  const queue = readDeleteQueue();
  if (queue.length === 0) return;
  const remaining: QueuedDelete[] = [];
  for (const item of queue) {
    try {
      const res = await fetch(URL_PATH, {
        method: "POST",
        headers: accountHeaders(accountId),
        body: JSON.stringify({ action: "delete", store: item.store, recordId: item.recordId }),
      });
      if (!res.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeDeleteQueue(remaining);
}

/**
 * Tell the server a photo the user deleted is gone.
 *
 * Called from the delete path in the photo diary and the carné, BEFORE the
 * local row is removed (its `uid` is the only name the backup knows it by).
 * The local delete must not wait on the network, so the deletion is queued
 * first and then attempted; the queue is retried on every later run until the
 * server confirms, and a queued photo is never restored (F03: an offline
 * delete used to leave the server copy live, and the next run downloaded the
 * deleted photo back onto this phone).
 */
export async function deleteRemotePhoto(
  store: PhotoStore,
  recordId: string | undefined,
): Promise<void> {
  if (!recordId) return;
  if (!(await isPhotoBackupOn())) return;
  const queue = readDeleteQueue();
  if (!queue.some((item) => item.store === store && item.recordId === recordId)) {
    writeDeleteQueue([...queue, { store, recordId }]);
  }
  const link = await ensureAccountLink();
  if (link.status === "linked") await flushDeletes(link.accountId);
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

interface LocalPhoto {
  id: number;
  uid: string;
  blob: Blob;
  uploadedAt?: number;
  remoteDeletedAt?: number;
  week?: number;
  createdAt: number;
}

async function pendingPhotos(store: PhotoStore): Promise<LocalPhoto[]> {
  const rows = (await db().table(store).toArray()) as LocalPhoto[];
  return rows.filter(
    (row) =>
      row.uploadedAt === undefined &&
      row.remoteDeletedAt === undefined &&
      row.uid !== undefined &&
      row.blob instanceof Blob,
  );
}

/**
 * What travels with a photo, as an opaque payload.
 *
 * Built field by field rather than by spreading the row — the same rule E1's
 * `buildSnapshot` follows, and here it also guarantees the **Blob never
 * reaches JSON.stringify**, which would silently serialise to `{}` and lose
 * the photo's metadata while looking like it worked.
 */
function payloadFor(store: PhotoStore, row: LocalPhoto): Record<string, unknown> {
  if (store === "photoEntries") {
    return { week: row.week ?? null, createdAt: row.createdAt };
  }
  return { createdAt: row.createdAt };
}

/** The server says this record was deleted (410): remember, never re-upload. */
async function markRemoteDeleted(store: PhotoStore, row: LocalPhoto): Promise<void> {
  await db().table(store).update(row.id, {
    uploadedAt: undefined,
    remoteDeletedAt: Date.now(),
  });
}

async function uploadOne(
  store: PhotoStore,
  row: LocalPhoto,
  accountId: string,
): Promise<boolean> {
  const contentType = row.blob.type || "image/jpeg";
  if (!isAllowedContentType(contentType)) return false;
  if (!isAllowedSize(row.blob.size)) return false;

  const signed = await fetch(URL_PATH, {
    method: "POST",
    headers: accountHeaders(accountId),
    body: JSON.stringify({
      action: "upload-url",
      store,
      recordId: row.uid,
      contentType,
      bytes: row.blob.size,
    }),
  });
  if (signed.status === 410) {
    await markRemoteDeleted(store, row);
    return false;
  }
  if (!signed.ok) return false;
  const { url } = (await signed.json()) as { url: string };

  // The URL signs Content-Length as the `bytes` declared above. There is no
  // header to add for it: `fetch` derives Content-Length from the Blob body and
  // does not let a script set it, so the two agree by construction.
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: row.blob,
  });
  if (!put.ok) return false;

  const confirmed = await fetch(URL_PATH, {
    method: "POST",
    headers: accountHeaders(accountId),
    body: JSON.stringify({
      action: "confirm",
      store,
      recordId: row.uid,
      contentType,
      bytes: row.blob.size,
      updatedAt: row.createdAt,
      payload: payloadFor(store, row),
    }),
  });
  if (confirmed.status === 410) {
    await markRemoteDeleted(store, row);
    return false;
  }
  if (!confirmed.ok) return false;

  await db().table(store).update(row.id, { uploadedAt: Date.now() });
  return true;
}

// ---------------------------------------------------------------------------
// Restore and reconcile
// ---------------------------------------------------------------------------

interface RemotePhoto {
  store: PhotoStore;
  recordId: string;
  contentType: string;
  bytes: number;
  payload: { week?: number | null; createdAt?: number } | null;
  deletedAt: number | null;
  downloadUrl: string | null;
}

async function restoreOne(remote: RemotePhoto, queued: Set<string>): Promise<boolean> {
  if (remote.deletedAt !== null || !remote.downloadUrl) return false;
  if (!isAllowedSize(remote.bytes)) return false;
  // F03: deleted here and not yet confirmed — never bring it back.
  if (queued.has(`${remote.store} ${remote.recordId}`)) return false;

  const table = db().table(remote.store);
  const existing = await table.where("uid").equals(remote.recordId).first();
  if (existing) return false;

  const res = await fetch(remote.downloadUrl);
  if (!res.ok) return false;
  const blob = await res.blob();
  // The bucket is ours, but the size cap is a rule about what this app stores,
  // not a guess about what the bucket returned.
  if (blob.size > MAX_PHOTO_BYTES) return false;

  const createdAt = remote.payload?.createdAt ?? Date.now();
  if (remote.store === "photoEntries") {
    await db().photoEntries.add({
      uid: remote.recordId,
      week: remote.payload?.week ?? 0,
      blob,
      createdAt,
      // Already on the server — restoring it must not schedule an upload of
      // the thing we just downloaded.
      uploadedAt: Date.now(),
    });
  } else {
    await db().carnePhotos.add({
      uid: remote.recordId,
      blob,
      createdAt,
      uploadedAt: Date.now(),
    });
  }
  return true;
}

/**
 * N2 — check this phone's "it is backed up" marks against the server's list.
 *
 * - marked uploaded, but the server has no row: the copy is gone (an opt-out
 *   on another device deletes every copy). Upload it again.
 * - the server has a tombstone: it was deleted on another device. Keep the
 *   photo on this phone, but never upload it again.
 */
async function reconcile(remote: Map<string, RemotePhoto>): Promise<void> {
  for (const store of PHOTO_BACKUP_STORES) {
    const table = db().table(store);
    for (const row of (await table.toArray()) as LocalPhoto[]) {
      if (row.uid === undefined || row.id === undefined) continue;
      const server = remote.get(`${store} ${row.uid}`);
      if (server?.deletedAt != null) {
        if (row.remoteDeletedAt === undefined) await markRemoteDeleted(store, row);
        continue;
      }
      if (!server && row.uploadedAt !== undefined) {
        await table.update(row.id, { uploadedAt: undefined });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let running = false;

/**
 * Settle pending deletions, download what is missing, check the marks,
 * upload what is pending.
 *
 * Never throws and never blocks a screen: every failure mode here — no account,
 * no bucket, no signal, a refused upload — is ordinary, and the photo diary
 * must work exactly as it did before K4 in all of them.
 *
 * Serial on purpose. Three parallel 2 MB uploads on Paraguayan mobile data is
 * how all three time out.
 */
export async function syncPhotos(): Promise<PhotoBackupSummary> {
  if (running) return { ...NOTHING, outcome: "ok" };
  const on = await isPhotoBackupOn();
  // Nothing to upload and nothing owed to the server: no request at all.
  if (!on && pendingPhotoDeletions() === 0) return NOTHING;

  running = true;
  let uploaded = 0;
  let restored = 0;

  try {
    const link = await ensureAccountLink();
    if (link.status === "mismatch") return { ...NOTHING, outcome: "account-mismatch" };
    if (link.status === "no-session") return { ...NOTHING, outcome: "unavailable" };
    if (link.status === "offline") return { ...NOTHING, outcome: "offline" };

    await flushDeletes(link.accountId);
    if (!on) return NOTHING;

    const listed = await fetch(URL_PATH, { headers: accountHeaders(link.accountId) });
    if (listed.status === 404 || listed.status === 401) {
      return { ...NOTHING, outcome: "unavailable" };
    }
    if (listed.status === 409) return { ...NOTHING, outcome: "account-mismatch" };
    if (!listed.ok) return { ...NOTHING, outcome: "error" };

    const body = (await listed.json()) as { photos: RemotePhoto[] };
    const photos = body.photos ?? [];
    const queued = new Set(readDeleteQueue().map((item) => `${item.store} ${item.recordId}`));
    for (const remote of photos) {
      if (await restoreOne(remote, queued)) restored += 1;
    }

    await reconcile(new Map(photos.map((p) => [`${p.store} ${p.recordId}`, p])));

    let pending = 0;
    for (const store of PHOTO_BACKUP_STORES) {
      for (const row of await pendingPhotos(store)) {
        if (await uploadOne(store, row, link.accountId)) uploaded += 1;
        else pending += 1;
      }
    }

    return { outcome: "ok", uploaded, restored, pending };
  } catch {
    return { outcome: "offline", uploaded, restored };
  } finally {
    running = false;
  }
}

let coordinatorStarted = false;

/**
 * F10 — run the photo backup by itself: shortly after the app opens (so a new
 * phone that synced `photoBackup: true` restores its photos without anyone
 * touching the switch) and whenever the connection comes back (so a photo
 * taken offline uploads without being re-added). Returns a teardown for React.
 */
export function startPhotoSync(delayMs: number = 2_000): () => void {
  if (typeof window === "undefined" || coordinatorStarted) return () => {};
  coordinatorStarted = true;
  const onOnline = () => void syncPhotos();
  window.addEventListener("online", onOnline);
  const timer = setTimeout(() => void syncPhotos(), delayMs);
  return () => {
    coordinatorStarted = false;
    clearTimeout(timer);
    window.removeEventListener("online", onOnline);
  };
}
