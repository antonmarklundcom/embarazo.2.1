"use client";

import { db, notDeleted, PHOTO_BACKUP_STORES } from "@/lib/db";
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

const URL_PATH = "/api/v1/photos";

export type PhotoBackupOutcome =
  | "ok"
  | "off"
  | "unavailable"
  | "offline"
  | "error";

export interface PhotoBackupSummary {
  outcome: PhotoBackupOutcome;
  uploaded: number;
  restored: number;
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

/**
 * Turn backup on or off.
 *
 * Turning it **off deletes the server copies immediately** — that is the task's
 * own acceptance criterion, and the only version of an opt-out worth having.
 * The local flag is written first so that a failed delete leaves the feature
 * off rather than on: the direction that fails safe is the one where nothing
 * further is uploaded.
 */
export async function setPhotoBackup(enabled: boolean): Promise<boolean> {
  try {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (first?.id) await db().profile.update(first.id, { photoBackup: enabled });
  } catch {
    return false;
  }

  if (enabled) return true;

  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-all" }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }

  // Every local photo is now un-uploaded again, so re-enabling backup uploads
  // them rather than believing a server copy that no longer exists.
  await clearUploadMarks();
  return true;
}

async function clearUploadMarks(): Promise<void> {
  for (const store of PHOTO_BACKUP_STORES) {
    const table = db().table(store);
    for (const row of await table.toArray()) {
      if (row.uploadedAt !== undefined && row.id !== undefined) {
        await table.update(row.id, { uploadedAt: undefined });
      }
    }
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
  week?: number;
  createdAt: number;
}

async function pendingPhotos(store: PhotoStore): Promise<LocalPhoto[]> {
  const rows = (await db().table(store).toArray()) as LocalPhoto[];
  return rows.filter(
    (row) =>
      row.uploadedAt === undefined &&
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

async function uploadOne(store: PhotoStore, row: LocalPhoto): Promise<boolean> {
  const contentType = row.blob.type || "image/jpeg";
  if (!isAllowedContentType(contentType)) return false;
  if (!isAllowedSize(row.blob.size)) return false;

  const signed = await fetch(URL_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload-url",
      store,
      recordId: row.uid,
      contentType,
      bytes: row.blob.size,
    }),
  });
  if (!signed.ok) return false;
  const { url } = (await signed.json()) as { url: string };

  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: row.blob,
  });
  if (!put.ok) return false;

  const confirmed = await fetch(URL_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  if (!confirmed.ok) return false;

  await db().table(store).update(row.id, { uploadedAt: Date.now() });
  return true;
}

// ---------------------------------------------------------------------------
// Restore
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

async function restoreOne(remote: RemotePhoto): Promise<boolean> {
  if (remote.deletedAt !== null || !remote.downloadUrl) return false;
  if (!isAllowedSize(remote.bytes)) return false;

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

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let running = false;

/**
 * Upload what is pending, download what is missing.
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
  if (!(await isPhotoBackupOn())) return NOTHING;

  running = true;
  let uploaded = 0;
  let restored = 0;

  try {
    const listed = await fetch(URL_PATH);
    if (listed.status === 404 || listed.status === 401) {
      return { ...NOTHING, outcome: "unavailable" };
    }
    if (!listed.ok) return { ...NOTHING, outcome: "error" };

    const body = (await listed.json()) as { photos: RemotePhoto[] };
    for (const remote of body.photos ?? []) {
      if (await restoreOne(remote)) restored += 1;
    }

    for (const store of PHOTO_BACKUP_STORES) {
      for (const row of await pendingPhotos(store)) {
        if (await uploadOne(store, row)) uploaded += 1;
      }
    }

    return { outcome: "ok", uploaded, restored };
  } catch {
    return { outcome: "offline", uploaded, restored };
  } finally {
    running = false;
  }
}

/**
 * Tell the server a photo the user deleted is gone.
 *
 * Called from the delete path in the photo diary. Best-effort: the local delete
 * is what the user asked for and must not depend on the network, and the next
 * `syncPhotos` cannot re-download the photo because the row it would restore
 * from is a tombstone.
 */
export async function deleteRemotePhoto(
  store: PhotoStore,
  recordId: string | undefined,
): Promise<void> {
  if (!recordId) return;
  if (!(await isPhotoBackupOn())) return;
  try {
    await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", store, recordId }),
    });
  } catch {
    // Offline. The photo is gone from this phone either way.
  }
}
