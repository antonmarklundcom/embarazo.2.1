import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "./db";
import { users } from "./schema";

/** A session checked before erasure is no longer permission to write. */
export class AccountWriteDenied extends Error {
  constructor() {
    super("Account no longer accepts writes");
    this.name = "AccountWriteDenied";
  }
}

/**
 * The user row is the erasure/write barrier, across processes and devices.
 * `markDeleting` updates this same row, so it waits for an earlier writer to
 * commit; a later writer sees deletedAt (or a missing row) and cannot start.
 * Every query in `write` MUST use the supplied transaction, never the pool.
 * Multiple owners are locked in one order to avoid companion/owner deadlocks.
 */
export async function withAccountWrite<T>(
  database: Database,
  userIds: string | readonly string[],
  write: (transaction: Database) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    for (const userId of [...new Set(typeof userIds === "string" ? [userIds] : userIds)].sort()) {
      const rows = await transaction
        .select({ id: users.id, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for("update");
      if (!rows[0] || rows[0].deletedAt !== null) throw new AccountWriteDenied();
    }
    return write(transaction as unknown as Database);
  });
}
