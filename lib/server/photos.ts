import "server-only";

import { and, eq, gt } from "drizzle-orm";

import type { Database } from "./db";
import { photoBlobs } from "./schema";
import type { PhotoStore } from "@/lib/photos/keys";

// BUILD-PLAN K4 — the index of what a user has backed up.
//
// The bytes live in object storage; this is the row that says one exists. It
// carries the photo's own metadata as an **opaque payload**, the same envelope
// `syncRecords` uses (§4.3) — a bump photo's week is health data, and the
// server has no reason to be able to read it.

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
 * Last-write-wins on the client `updatedAt`, exactly like A3's sync: a photo
 * deleted on one phone and re-added on another has to resolve the same way
 * whichever order the requests arrive in.
 */
export async function recordPhoto(
  database: Database,
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
  const values = {
    userId,
    store: input.store,
    recordId: input.recordId,
    objectKey: input.objectKey,
    contentType: input.contentType,
    bytes: input.bytes,
    payload: input.payload ?? null,
    updatedAt: input.updatedAt,
    deletedAt: null as number | null,
    serverUpdatedAt: now,
  };

  await database
    .insert(photoBlobs)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        objectKey: values.objectKey,
        contentType: values.contentType,
        bytes: values.bytes,
        payload: values.payload,
        updatedAt: values.updatedAt,
        deletedAt: null,
        serverUpdatedAt: now,
      },
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
  database: Database,
  userId: string,
  store: PhotoStore,
  recordId: string,
  now: number,
): Promise<string | null> {
  const rows = await database
    .select({ objectKey: photoBlobs.objectKey })
    .from(photoBlobs)
    .where(
      and(
        eq(photoBlobs.userId, userId),
        eq(photoBlobs.store, store),
        eq(photoBlobs.recordId, recordId),
      ),
    )
    .limit(1);

  const objectKey = rows[0]?.objectKey ?? null;
  if (!objectKey) return null;

  await database
    .update(photoBlobs)
    .set({
      deletedAt: now,
      payload: null,
      bytes: 0,
      serverUpdatedAt: now,
    })
    .where(
      and(
        eq(photoBlobs.userId, userId),
        eq(photoBlobs.store, store),
        eq(photoBlobs.recordId, recordId),
      ),
    );

  return objectKey;
}

/** Everything this user has, changed after `since`. */
export async function listPhotos(
  database: Database,
  userId: string,
  since = 0,
): Promise<PhotoBlobRecord[]> {
  const rows = await database
    .select()
    .from(photoBlobs)
    .where(
      and(eq(photoBlobs.userId, userId), gt(photoBlobs.serverUpdatedAt, since)),
    );

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
  database: Database,
  userId: string,
): Promise<{ store: PhotoStore; recordId: string; objectKey: string }[]> {
  const rows = await database
    .select({
      store: photoBlobs.store,
      recordId: photoBlobs.recordId,
      objectKey: photoBlobs.objectKey,
    })
    .from(photoBlobs)
    .where(eq(photoBlobs.userId, userId));

  return rows.map((row) => ({
    store: row.store as PhotoStore,
    recordId: row.recordId,
    objectKey: row.objectKey,
  }));
}

/** Drop every row for this user. Used by the opt-out, after the objects go. */
export async function deleteAllPhotoRows(
  database: Database,
  userId: string,
): Promise<void> {
  await database.delete(photoBlobs).where(eq(photoBlobs.userId, userId));
}
