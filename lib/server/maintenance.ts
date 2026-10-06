import "server-only";

import { lt } from "drizzle-orm";

import type { Database } from "./db";
import { finishPendingDeletions } from "./account";
import { verificationTokens } from "./schema";

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

const PENDING_DELETION_GRACE_MS = 10 * 60 * 1000;

export interface MaintenanceResult {
  deletionsCompleted: number;
  expiredTokens: number;
}

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
  return { deletionsCompleted, expiredTokens };
}
