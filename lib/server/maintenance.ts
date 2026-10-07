import "server-only";

import { and, eq, isNull, lt, sql } from "drizzle-orm";

import type { Database } from "./db";
import { finishPendingDeletions } from "./account";
import { deleteObject } from "./photoStorage";
import { photoBlobs, users, verificationTokens } from "./schema";

// Housekeeping that has to happen even when nobody signs in again. It rides
// the one scheduled request this deployment already has
// (`/api/v1/push/dispatch`, called by Hostinger's cron), rather than adding a
// second secret-guarded endpoint.
//
// - F02: an account erasure that was interrupted (crash, timeout) is left
//   marked `deletedAt`; its sessions are already revoked. This completes it.
//   The 10-minute grace keeps it from racing a deletion still in progress.
// - F19: expired reset/confirmation tokens hold an email address in clear
//   text. Nothing used to delete one that was never clicked.
// - F03: a photo whose object the storage provider failed to delete during an
//   account erasure keeps its row after the user row is gone. Those rows are
//   the retry list; each goes once the provider confirms. The wait (longer
//   than the 15-minute upload URL) also catches a late PUT to a known key.

const PENDING_DELETION_GRACE_MS = 10 * 60 * 1000;

export interface MaintenanceResult {
  deletionsCompleted: number;
  expiredTokens: number;
  orphanPhotosDeleted: number;
}

const ORPHAN_PHOTO_GRACE_MS = 20 * 60 * 1000;

function affected(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const rows = (header as { affectedRows?: number } | undefined)?.affectedRows;
  return typeof rows === "number" ? rows : 0;
}

export async function runMaintenance(
  database: Database,
  now: number = Date.now(),
): Promise<MaintenanceResult> {
  const deletionsCompleted = await finishPendingDeletions(database, {
    olderThanMs: PENDING_DELETION_GRACE_MS,
  });
  const expiredTokens = affected(
    await database
      .delete(verificationTokens)
      .where(lt(verificationTokens.expires, new Date(now))),
  );
  const orphanPhotosDeleted = await retryOrphanPhotos(database, now);
  return { deletionsCompleted, expiredTokens, orphanPhotosDeleted };
}

/** Photo rows whose account no longer exists: delete the object, then the row. */
async function retryOrphanPhotos(database: Database, now: number, limit = 20): Promise<number> {
  const orphans = await database
    .select({
      userId: photoBlobs.userId,
      store: photoBlobs.store,
      recordId: photoBlobs.recordId,
      objectKey: photoBlobs.objectKey,
    })
    .from(photoBlobs)
    .leftJoin(users, eq(users.id, photoBlobs.userId))
    .where(
      and(
        isNull(users.id),
        sql`${photoBlobs.serverUpdatedAt} < ${now - ORPHAN_PHOTO_GRACE_MS}`,
      ),
    )
    .limit(limit);
  let deleted = 0;
  for (const row of orphans) {
    if (!(await deleteObject(row.userId, row.objectKey))) continue;
    await database
      .delete(photoBlobs)
      .where(
        and(
          eq(photoBlobs.userId, row.userId),
          eq(photoBlobs.store, row.store),
          eq(photoBlobs.recordId, row.recordId),
        ),
      );
    deleted += 1;
  }
  return deleted;
}
