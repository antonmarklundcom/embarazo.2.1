import "server-only";

import type { PhotosBackend } from "./photosBackend";
import type { PhotoStore } from "@/lib/photos/keys";

// BUILD-PLAN K4 — the index of what a user has backed up.
//
// The bytes live in object storage; this is the row that says one exists. It
// carries the photo's own metadata as an **opaque payload**, the same envelope
// `syncRecords` uses (§4.3) — a bump photo's week is health data, and the
// server has no reason to be able to read it.
//
// W5: every function below takes a `PhotosBackend` (`lib/server/
// photosBackend.ts`) rather than a `Database`, the same cut V2 gave
// `sharing.ts`. `photos.test.ts` runs these functions, unchanged, over a Map.

export interface PhotoBlobRecord {
  store: PhotoStore;
  recordId: string;
  objectKey: string;
  contentType: string;
  bytes: number;
  payload: unknown;
  updatedAt: number;
  deletedAt: number | null;
  serverUpdatedAt: number;
}

/**
 * Record an uploaded photo, or update the record of one.
 *
 * Last-write-wins on the client `updatedAt` is the backend's contract for
 * `upsert` — exactly like A3's sync — so a photo deleted on one phone and
 * re-added on another resolves the same way whichever order the requests
 * arrive in.
 */
export async function recordPhoto(
  backend: PhotosBackend,
  userId: string,
  input: {
    store: PhotoStore;
    recordId: string;
    objectKey: string;
    contentType: string;
    bytes: number;
    payload: unknown;
    updatedAt: number;
  },
  now: number,
): Promise<void> {
  await backend.upsert({
    userId,
    store: input.store,
    recordId: input.recordId,
    objectKey: input.objectKey,
    contentType: input.contentType,
    bytes: input.bytes,
    payload: input.payload ?? null,
    updatedAt: input.updatedAt,
    deletedAt: null,
    serverUpdatedAt: now,
  });
}

/**
 * Mark one photo deleted and forget its metadata.
 *
 * The row survives as a **tombstone** so a second device learns the photo is
 * gone instead of re-uploading it forever — but the payload is nulled in the
 * same statement. There is no reason for the server to keep the week of a
 * photo the user just deleted, which is the rule A3 already applies to a
 * deleted sync record.
 */
export async function markPhotoDeleted(
  backend: PhotosBackend,
  userId: string,
  store: PhotoStore,
  recordId: string,
  now: number,
): Promise<string | null> {
  const objectKey = await backend.findObjectKey(userId, store, recordId);
  if (!objectKey) return null;

  await backend.markDeleted(userId, store, recordId, {
    deletedAt: now,
    payload: null,
    bytes: 0,
    serverUpdatedAt: now,
  });

  return objectKey;
}

/** Everything this user has, changed after `since`. */
export async function listPhotos(
  backend: PhotosBackend,
  userId: string,
  since = 0,
): Promise<PhotoBlobRecord[]> {
  const rows = await backend.listSince(userId, since);

  return rows.map((row) => ({
    store: row.store as PhotoStore,
    recordId: row.recordId,
    objectKey: row.objectKey,
    contentType: row.contentType,
    bytes: row.bytes,
    payload: row.payload,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    serverUpdatedAt: row.serverUpdatedAt,
  }));
}

/** Every live object key for this user — the opt-out and deletion paths. */
export async function allObjectKeys(
  backend: PhotosBackend,
  userId: string,
): Promise<{ store: PhotoStore; recordId: string; objectKey: string }[]> {
  const rows = await backend.allKeys(userId);

  return rows.map((row) => ({
    store: row.store as PhotoStore,
    recordId: row.recordId,
    objectKey: row.objectKey,
  }));
}

/** Drop every row for this user. Used by the opt-out, after the objects go. */
export async function deleteAllPhotoRows(
  backend: PhotosBackend,
  userId: string,
): Promise<void> {
  await backend.deleteAllRows(userId);
}
