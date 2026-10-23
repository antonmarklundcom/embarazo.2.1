import "server-only";

import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { PHOTO_STORES, type PhotoStore } from "@/lib/photos/keys";
import type { Database } from "./db";
import { deleteObject, UPLOAD_URL_TTL_SECONDS } from "./photoStorage";
import { photoBlobs, users } from "./schema";

// A payload-free cleanup obligation in the existing varchar store. Never
// returned as photo metadata. Keep it even after successful DELETE: an old PUT
// may have started before URL expiry and finish afterwards. A provider maximum
// request duration has not been established, so a fixed grace is not permission
// to discard the only key that can clean up that late completion.
const PREFIX = "upload:";
export const UPLOAD_COMPLETION_GRACE_MS = 20 * 60 * 1000;
export const UPLOAD_CLEANUP_RETRY_MS = 20 * 60 * 1000;
export const uploadIntentStore = (store: PhotoStore): string => `${PREFIX}${store}`;
export const isUploadIntentStore = (store: string): boolean =>
  PHOTO_STORES.some((value) => uploadIntentStore(value) === store);
/** Earliest cleanup attempt, not a safe compaction deadline. */
export const uploadRetentionUntil = (expiresAt: number): number => expiresAt + UPLOAD_COMPLETION_GRACE_MS;

/** Called in the account write transaction BEFORE returning any signed URL. */
export async function rememberUploadIntent(
  database: Database,
  userId: string,
  store: PhotoStore,
  recordId: string,
  objectKey: string,
  now: number,
): Promise<void> {
  await database.insert(photoBlobs).values({
    userId, store: uploadIntentStore(store), recordId, objectKey,
    contentType: "application/x-mibebe-upload-intent", bytes: 0, payload: null,
    updatedAt: now + UPLOAD_URL_TTL_SECONDS * 1000,
    deletedAt: now, serverUpdatedAt: now,
  }).onDuplicateKeyUpdate({ set: {
    updatedAt: sql`greatest(${photoBlobs.updatedAt}, values(${photoBlobs.updatedAt}))`,
    serverUpdatedAt: sql`greatest(${photoBlobs.serverUpdatedAt}, values(${photoBlobs.serverUpdatedAt}))`,
  } });
}

/** Retry cleanup fairly; retain every capability's key, including live photos. */
export async function retryUploadIntents(database: Database, now: number, limit = 20): Promise<number> {
  const candidates = await database.select({ userId: photoBlobs.userId, store: photoBlobs.store, recordId: photoBlobs.recordId })
    .from(photoBlobs).where(and(
      inArray(photoBlobs.store, PHOTO_STORES.map(uploadIntentStore)),
      lt(photoBlobs.updatedAt, now - UPLOAD_COMPLETION_GRACE_MS),
      lt(photoBlobs.serverUpdatedAt, now - UPLOAD_CLEANUP_RETRY_MS),
    )).orderBy(asc(photoBlobs.serverUpdatedAt)).limit(limit);
  let cleaned = 0;
  for (const candidate of candidates) {
    cleaned += await database.transaction(async (transaction) => {
      // Same user -> photo lock order as signing/confirmation, including a
      // deleting account. One provider DELETE is bounded to ten seconds.
      const owners = await transaction.select({ deletedAt: users.deletedAt }).from(users)
        .where(eq(users.id, candidate.userId)).limit(1).for("update");
      const key = and(eq(photoBlobs.userId, candidate.userId), eq(photoBlobs.store, candidate.store), eq(photoBlobs.recordId, candidate.recordId));
      const rows = await transaction.select().from(photoBlobs).where(key).limit(1).for("update");
      const intent = rows[0];
      if (!intent || uploadRetentionUntil(intent.updatedAt) > now || intent.serverUpdatedAt >= now - UPLOAD_CLEANUP_RETRY_MS) return 0;
      const photos = await transaction.select({ deletedAt: photoBlobs.deletedAt }).from(photoBlobs)
        .where(and(eq(photoBlobs.userId, candidate.userId), eq(photoBlobs.store, candidate.store.slice(PREFIX.length)), eq(photoBlobs.recordId, candidate.recordId))).limit(1);
      const live = owners[0]?.deletedAt === null && photos[0]?.deletedAt === null;
      const deleted = !live && await deleteObject(candidate.userId, intent.objectKey);
      // Rotate successful, failed and live checks alike, so the first twenty
      // keys cannot starve later obligations. Never remove this retry pointer.
      await transaction.update(photoBlobs).set({ serverUpdatedAt: now }).where(key);
      return deleted ? 1 : 0;
    });
  }
  return cleaned;
}
