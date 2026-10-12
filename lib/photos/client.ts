"use client";

import { db, notDeleted, PHOTO_BACKUP_STORES } from "@/lib/db";
import { accountHeaders, ensureAccountLink } from "@/lib/sync/client";
import { SyncLifecycle } from "@/lib/sync/lifecycle";
import { assertLocalAccountOwner, LocalAccountChanged } from "@/lib/sync/writeGuard";
import {
  readPhotoDeleteQueue as readDeleteQueue,
  writePhotoDeleteQueue as writeDeleteQueue,
  readPhotoDeleteAllOwners,
  writePhotoDeleteAllOwners,
} from "@/lib/sync/photoDeletions";
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
const lifecycle = new SyncLifecycle();

export function pausePhotoSyncForDeviceWipe(): Promise<void> {
  return lifecycle.pause();
}

export function resumePhotoSyncAfterFailedWipe(): void {
  lifecycle.resume();
}

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
  const operation = lifecycle.begin();
  if (!operation) return "failed";
  try {
    if (!(await writePreference(enabled))) return "failed";
    if (enabled) return "done";

    const originalAccount = (await db().syncState.get("default"))?.accountId;
    // Durably record an already-linked account's obligation before any network
    // request. Closing the app during the probe must not lose the opt-out.
    if (originalAccount) writePhotoDeleteAllOwners([...readPhotoDeleteAllOwners(), originalAccount]);
    const link = await ensureAccountLink();
    operation.signal.throwIfAborted();
    const accountId = originalAccount ?? (link.status === "linked" ? link.accountId : undefined);
    // Without a link this device has never uploaded photos. Do not create an
    // ownerless delete-all that could later be aimed at its first account.
    if (!accountId) return pendingPhotoDeletions() > 0 ? "pending" : "done";
    if (!originalAccount) writePhotoDeleteAllOwners([...readPhotoDeleteAllOwners(), accountId]);
    // Signed in as B while holding A's data: retain A's obligation, send nothing.
    if (link.status === "mismatch") return "account-mismatch";
    if (link.status !== "linked") return "pending";
    return (await flushDeleteAll(link.accountId, operation.signal)) ? "done" : "pending";
  } catch {
    return "failed";
  } finally {
    operation.finish();
  }
}

async function clearUploadMarks(accountId: string): Promise<void> {
  const instance = db();
  await instance.transaction("rw", [...PHOTO_BACKUP_STORES, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    for (const store of PHOTO_BACKUP_STORES) {
      const table = instance.table(store);
      for (const row of await table.toArray()) {
        if ((row.uploadedAt !== undefined || row.remoteDeletedAt !== undefined) && row.id !== undefined) {
          await table.update(row.id, { uploadedAt: undefined, remoteDeletedAt: undefined });
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// F03 — deletions are queued until the server confirms them
// ---------------------------------------------------------------------------

/** How many deletions this phone has not had confirmed yet (for Ajustes). */
export function pendingPhotoDeletions(): number {
  return readDeleteQueue().length + readPhotoDeleteAllOwners().length;
}

async function flushDeleteAll(accountId: string, signal: AbortSignal): Promise<boolean> {
  if (!readPhotoDeleteAllOwners().includes(accountId)) return false;
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: accountHeaders(accountId),
      signal,
      body: JSON.stringify({ action: "delete-all" }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  signal.throwIfAborted();
  writePhotoDeleteAllOwners(readPhotoDeleteAllOwners().filter((owner) => owner !== accountId));
  // Every local photo is now un-uploaded again, so re-enabling backup uploads
  // them rather than believing a server copy that no longer exists.
  if ((await db().syncState.get("default"))?.accountId === accountId) await clearUploadMarks(accountId);
  return true;
}

async function flushDeletes(accountId: string, signal: AbortSignal): Promise<void> {
  if (readPhotoDeleteAllOwners().includes(accountId)) await flushDeleteAll(accountId, signal);

  // Jobs belonging to A remain queued while B is signed in. Legacy jobs with
  // no provenance remain pending; a login is never evidence of their owner.
  const queue = readDeleteQueue().filter((item) => item.accountId === accountId);
  if (queue.length === 0) return;
  for (const item of queue) {
    signal.throwIfAborted();
    try {
      const res = await fetch(URL_PATH, {
        method: "POST",
        headers: accountHeaders(accountId),
        signal,
        body: JSON.stringify({ action: "delete", store: item.store, recordId: item.recordId }),
      });
      signal.throwIfAborted();
      if (res.ok) {
        // Re-read after the request: another local delete may have been queued
        // while it was in flight, and must not be lost with this acknowledgement.
        writeDeleteQueue(readDeleteQueue().filter((entry) =>
          entry.accountId !== accountId || entry.store !== item.store || entry.recordId !== item.recordId,
        ));
      }
    } catch {
      // Keep the original-account job until its own server confirms.
    }
  }
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
  const operation = lifecycle.begin();
  if (!operation) return;
  try {
    if (!recordId) return;
    if (!(await isPhotoBackupOn())) return;
    const originalAccount = (await db().syncState.get("default"))?.accountId;
    const enqueue = (accountId: string) => {
      const queue = readDeleteQueue();
      if (!queue.some((item) => item.accountId === accountId && item.store === store && item.recordId === recordId)) {
        writeDeleteQueue([...queue, { store, recordId, accountId }]);
      }
    };
    if (originalAccount) enqueue(originalAccount);
    const link = await ensureAccountLink();
    operation.signal.throwIfAborted();
    const accountId = originalAccount ?? (link.status === "linked" ? link.accountId : undefined);
    if (!accountId) return;
    if (!originalAccount) enqueue(accountId);
    if (link.status === "linked") await flushDeletes(link.accountId, operation.signal);
  } finally {
    operation.finish();
  }
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

async function pendingPhotos(store: PhotoStore, accountId: string): Promise<LocalPhoto[]> {
  const instance = db();
  return instance.transaction("r", [store, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    const rows = await instance.table(store).toArray() as LocalPhoto[];
    return rows.filter(row => row.uploadedAt === undefined && row.remoteDeletedAt === undefined
      && row.uid !== undefined && row.blob instanceof Blob);
  });
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
async function markRemoteDeleted(store: PhotoStore, row: LocalPhoto, accountId: string): Promise<void> {
  const instance = db();
  await instance.transaction("rw", [store, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    const current = await instance.table(store).get(row.id);
    if (current?.uid !== row.uid) return;
    await instance.table(store).update(row.id, {uploadedAt:undefined, remoteDeletedAt:Date.now()});
  });
}

async function uploadOne(
  store: PhotoStore,
  row: LocalPhoto,
  accountId: string,
  signal: AbortSignal,
): Promise<boolean> {
  const contentType = row.blob.type || "image/jpeg";
  if (!isAllowedContentType(contentType)) return false;
  if (!isAllowedSize(row.blob.size)) return false;

  const signed = await fetch(URL_PATH, {
    method: "POST",
    headers: accountHeaders(accountId),
    signal,
    body: JSON.stringify({
      action: "upload-url",
      store,
      recordId: row.uid,
      contentType,
      bytes: row.blob.size,
    }),
  });
  if (signed.status === 410) {
    await markRemoteDeleted(store, row, accountId);
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
    signal,
  });
  if (!put.ok) return false;

  const confirmed = await fetch(URL_PATH, {
    method: "POST",
    headers: accountHeaders(accountId),
    signal,
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
    await markRemoteDeleted(store, row, accountId);
    return false;
  }
  if (!confirmed.ok) return false;

  signal.throwIfAborted();
  const instance = db();
  return instance.transaction("rw", [store, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    const current = await instance.table(store).get(row.id);
    if (current?.uid !== row.uid) return false;
    await instance.table(store).update(row.id, { uploadedAt: Date.now() });
    return true;
  });
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

async function restoreOne(remote: RemotePhoto, queued: Set<string>, signal: AbortSignal, accountId: string): Promise<boolean> {
  if (remote.deletedAt !== null || !remote.downloadUrl) return false;
  if (!isAllowedSize(remote.bytes)) return false;
  // F03: deleted here and not yet confirmed — never bring it back.
  if (queued.has(`${remote.store} ${remote.recordId}`)) return false;

  const table = db().table(remote.store);
  const existing = await table.where("uid").equals(remote.recordId).first();
  if (existing) return false;

  const res = await fetch(remote.downloadUrl, { signal });
  if (!res.ok) return false;
  const blob = await res.blob();
  signal.throwIfAborted();
  // The bucket is ours, but the size cap is a rule about what this app stores,
  // not a guess about what the bucket returned.
  if (blob.size > MAX_PHOTO_BYTES) return false;

  const instance = db();
  return instance.transaction("rw", [remote.store, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    // A local delete/opt-out may have happened while the blob was downloading.
    if (readPhotoDeleteAllOwners().includes(accountId) || readDeleteQueue().some(item =>
      (!item.accountId || item.accountId === accountId) && item.store === remote.store && item.recordId === remote.recordId)) return false;
    const existingNow = await instance.table(remote.store).where("uid").equals(remote.recordId).first();
    if (existingNow) return false;
    const createdAt = remote.payload?.createdAt ?? Date.now();
    if (remote.store === "photoEntries") {
      await instance.photoEntries.add({ uid:remote.recordId, week:remote.payload?.week ?? 0,
        blob, createdAt, uploadedAt:Date.now() });
    } else {
      await instance.carnePhotos.add({uid:remote.recordId, blob, createdAt, uploadedAt:Date.now()});
    }
    return true;
  });
}

/**
 * N2 — check this phone's "it is backed up" marks against the server's list.
 *
 * - marked uploaded, but the server has no row: the copy is gone (an opt-out
 *   on another device deletes every copy). Upload it again.
 * - the server has a tombstone: it was deleted on another device. Keep the
 *   photo on this phone, but never upload it again.
 */
async function reconcile(remote: Map<string, RemotePhoto>, accountId: string): Promise<void> {
  const instance = db();
  await instance.transaction("rw", [...PHOTO_BACKUP_STORES, "syncState"], async () => {
    await assertLocalAccountOwner(instance, accountId);
    for (const store of PHOTO_BACKUP_STORES) {
      const table = instance.table(store);
      for (const row of (await table.toArray()) as LocalPhoto[]) {
        if (row.uid === undefined || row.id === undefined) continue;
        const server = remote.get(store + " " + row.uid);
        if (server?.deletedAt != null) {
          if (row.remoteDeletedAt === undefined) await table.update(row.id, {uploadedAt:undefined, remoteDeletedAt:Date.now()});
        } else if (!server && row.uploadedAt !== undefined) {
          await table.update(row.id, {uploadedAt:undefined});
        }
      }
    }
  });
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
  const operation = lifecycle.begin();
  if (!operation) return NOTHING;

  running = true;
  let uploaded = 0;
  let restored = 0;

  try {
    const on = await isPhotoBackupOn();
    // Nothing to upload and nothing owed to the server: no request at all.
    if (!on && pendingPhotoDeletions() === 0) return NOTHING;
    const link = await ensureAccountLink();
    operation.signal.throwIfAborted();
    if (link.status === "mismatch") return { ...NOTHING, outcome: "account-mismatch" };
    if (link.status === "no-session") return { ...NOTHING, outcome: "unavailable" };
    if (link.status === "offline") return { ...NOTHING, outcome: "offline" };

    await flushDeletes(link.accountId, operation.signal);
    if (!on) return NOTHING;
    if (readPhotoDeleteAllOwners().includes(link.accountId)) return { ...NOTHING, outcome: "error" };

    const listed = await fetch(URL_PATH, { headers: accountHeaders(link.accountId), signal: operation.signal });
    if (listed.status === 404 || listed.status === 401) {
      return { ...NOTHING, outcome: "unavailable" };
    }
    if (listed.status === 409) return { ...NOTHING, outcome: "account-mismatch" };
    if (!listed.ok) return { ...NOTHING, outcome: "error" };

    const body = (await listed.json()) as { photos: RemotePhoto[] };
    operation.signal.throwIfAborted();
    const photos = body.photos ?? [];
    const queued = new Set(readDeleteQueue()
      .filter((item) => !item.accountId || item.accountId === link.accountId)
      .map((item) => `${item.store} ${item.recordId}`));
    for (const remote of photos) {
      operation.signal.throwIfAborted();
      if (await restoreOne(remote, queued, operation.signal, link.accountId)) restored += 1;
    }

    await reconcile(new Map(photos.map((p) => [`${p.store} ${p.recordId}`, p])), link.accountId);

    let pending = 0;
    for (const store of PHOTO_BACKUP_STORES) {
      for (const row of await pendingPhotos(store, link.accountId)) {
        operation.signal.throwIfAborted();
        if (await uploadOne(store, row, link.accountId, operation.signal)) uploaded += 1;
        else pending += 1;
      }
    }

    return { outcome: "ok", uploaded, restored, pending };
  } catch (err) {
    if (err instanceof LocalAccountChanged) return { ...NOTHING, outcome: "account-mismatch" };
    return { outcome: "offline", uploaded, restored };
  } finally {
    running = false;
    operation.finish();
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
