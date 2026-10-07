import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import type { Database } from "./db";
import { photoBlobs } from "./schema";

// BUILD-PLAN K4, W5 — the storage half of the photo backup index.
//
// Same cut as V2's `sharingBackend.ts`: `photos.ts` holds the decisions —
// last-write-wins on `updatedAt`, and that a deleted photo's payload is
// nulled in the same write as its tombstone — and this file holds every query
// against `photoBlobs`. `photos.test.ts` runs the real `photos.ts` over a Map.
//
// No policy: nothing here decides what a payload contains or whether a
// deletion is allowed. It runs the query it is handed.

export interface StoredPhotoRow {
  store: string;
  recordId: string;
  objectKey: string;
  contentType: string;
  bytes: number;
  payload: unknown;
  updatedAt: number;
  deletedAt: number | null;
  serverUpdatedAt: number;
}

export interface PhotosBackend {
  upsert(row: {
    userId: string;
    store: string;
    recordId: string;
    objectKey: string;
    contentType: string;
    bytes: number;
    payload: unknown;
    updatedAt: number;
    deletedAt: number | null;
    serverUpdatedAt: number;
  }): Promise<void>;
  /** The live object key for one photo, or null. */
  findObjectKey(userId: string, store: string, recordId: string): Promise<string | null>;
  /** The row's state, or null when there is none (F03). */
  findRow(
    userId: string,
    store: string,
    recordId: string,
  ): Promise<{ objectKey: string; deletedAt: number | null } | null>;
  /** Drop one row (after its object is confirmed gone). */
  deleteRow(userId: string, store: string, recordId: string): Promise<void>;
  markDeleted(
    userId: string,
    store: string,
    recordId: string,
    fields: { deletedAt: number; payload: null; bytes: number; serverUpdatedAt: number },
  ): Promise<void>;
  listSince(userId: string, since: number): Promise<StoredPhotoRow[]>;
  allKeys(
    userId: string,
  ): Promise<{ store: string; recordId: string; objectKey: string }[]>;
  deleteAllRows(userId: string): Promise<void>;
}

function toStored(row: typeof photoBlobs.$inferSelect): StoredPhotoRow {
  return {
    store: row.store,
    recordId: row.recordId,
    objectKey: row.objectKey,
    contentType: row.contentType,
    bytes: row.bytes,
    payload: row.payload,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    serverUpdatedAt: row.serverUpdatedAt,
  };
}

/** The real thing. Constructed once per request. */
export function drizzlePhotosBackend(database: Database): PhotosBackend {
  return {
    async upsert(row) {
      // F03 — the last-write-wins this file's header always promised, now in
      // SQL. A row is replaced only while it is live, or when the incoming
      // write is newer than its tombstone. A `confirm` that arrives after the
      // photo was deleted (a slow upload, an offline phone) carries the photo's
      // creation time, which is older than the deletion, so it no longer
      // resurrects the record. `deletedAt` is assigned LAST: MySQL evaluates
      // these left to right, and every condition must read the stored value.
      const wins = sql`(${photoBlobs.deletedAt} is null or values(${photoBlobs.updatedAt}) > ${photoBlobs.deletedAt})`;
      const pick = (column: typeof photoBlobs.objectKey | typeof photoBlobs.contentType | typeof photoBlobs.bytes | typeof photoBlobs.payload | typeof photoBlobs.updatedAt | typeof photoBlobs.serverUpdatedAt | typeof photoBlobs.deletedAt) =>
        sql`if(${wins}, values(${column}), ${column})`;
      await database
        .insert(photoBlobs)
        .values(row)
        .onDuplicateKeyUpdate({
          set: {
            objectKey: pick(photoBlobs.objectKey),
            contentType: pick(photoBlobs.contentType),
            bytes: pick(photoBlobs.bytes),
            payload: pick(photoBlobs.payload),
            updatedAt: pick(photoBlobs.updatedAt),
            serverUpdatedAt: pick(photoBlobs.serverUpdatedAt),
            deletedAt: pick(photoBlobs.deletedAt),
          },
        });
    },

    async findRow(userId, store, recordId) {
      const rows = await database
        .select({ objectKey: photoBlobs.objectKey, deletedAt: photoBlobs.deletedAt })
        .from(photoBlobs)
        .where(
          and(
            eq(photoBlobs.userId, userId),
            eq(photoBlobs.store, store),
            eq(photoBlobs.recordId, recordId),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async deleteRow(userId, store, recordId) {
      await database
        .delete(photoBlobs)
        .where(
          and(
            eq(photoBlobs.userId, userId),
            eq(photoBlobs.store, store),
            eq(photoBlobs.recordId, recordId),
          ),
        );
    },

    async findObjectKey(userId, store, recordId) {
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
      return rows[0]?.objectKey ?? null;
    },

    async markDeleted(userId, store, recordId, fields) {
      await database
        .update(photoBlobs)
        .set(fields)
        .where(
          and(
            eq(photoBlobs.userId, userId),
            eq(photoBlobs.store, store),
            eq(photoBlobs.recordId, recordId),
          ),
        );
    },

    async listSince(userId, since) {
      const rows = await database
        .select()
        .from(photoBlobs)
        .where(and(eq(photoBlobs.userId, userId), gt(photoBlobs.serverUpdatedAt, since)));
      return rows.map(toStored);
    },

    async allKeys(userId) {
      return database
        .select({
          store: photoBlobs.store,
          recordId: photoBlobs.recordId,
          objectKey: photoBlobs.objectKey,
        })
        .from(photoBlobs)
        .where(eq(photoBlobs.userId, userId));
    },

    async deleteAllRows(userId) {
      await database.delete(photoBlobs).where(eq(photoBlobs.userId, userId));
    },
  };
}
