import "server-only";

import { and, asc, eq, gte, or, sql } from "drizzle-orm";

import type { Database } from "./db";
import { syncRecords } from "./schema";
import { serverAccepts } from "@/lib/sync/merge";
import {
  DEFAULT_PULL_LIMIT,
  MAX_CLOCK_SKEW_MS,
  MAX_PULL_LIMIT,
  decodeCursor,
  encodeCursor,
  type PullResponse,
  type PushResponse,
  type PushResult,
  type SyncRecordInput,
} from "@/lib/sync/protocol";

// BUILD-PLAN A3 — the server half of sync.
//
// The handlers are written against a small `SyncBackend` interface rather than
// against Drizzle directly. That is not architecture for its own sake: it is
// what lets the convergence tests run two real clients against one real server
// implementation in `sync.test.ts`, with no MySQL in CI. The Drizzle backend
// below is the only thing those tests do not exercise, and it is thirty lines.
//
// The server never looks inside `payload`. It compares `updatedAt`, stores the
// blob, and hands it back (ARCHITECTURE.md §4.3).

export interface StoredRecord {
  userId: string;
  store: string;
  recordId: string;
  pregnancyId: string | null;
  /** Client-authored. The only thing last-write-wins compares. */
  updatedAt: number;
  deletedAt: number | null;
  /** Server-authored write clock. The only thing the pull cursor uses. */
  serverUpdatedAt: number;
  payload: Record<string, unknown> | null;
}

export interface RecordKey {
  store: string;
  recordId: string;
}

export interface SyncBackend {
  /** Current server state for the given keys. Missing keys are simply absent. */
  getMany(userId: string, keys: RecordKey[]): Promise<StoredRecord[]>;
  /**
   * Upsert with last-write-wins applied atomically: a stored record with a
   * newer `updatedAt` must survive, even if two pushes race.
   */
  upsertMany(records: StoredRecord[]): Promise<void>;
  /** One ordered page, starting at (or after) the given position. */
  page(
    userId: string,
    from: { serverUpdatedAt: number; store?: string; recordId?: string },
    limit: number,
  ): Promise<StoredRecord[]>;
}

function keyOf(store: string, recordId: string): string {
  return `${store} ${recordId}`;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

/**
 * Apply a batch of client records.
 *
 * Every record gets an outcome. `stale` means the server holds something newer
 * — not an error, and the client clears its dirty flag on it just as it does on
 * `accepted`, because the next pull delivers the winner. `rejected` is reserved
 * for records that must never be stored at all, which today is only a timestamp
 * far enough in the future to poison every later comparison.
 */
export async function pushRecords(
  backend: SyncBackend,
  userId: string,
  records: SyncRecordInput[],
  now: number,
  // I1/U6. Threaded through rather than read here so these handlers stay
  // storage-free and testable against a Map (see the note at the top).
  epoch?: number,
): Promise<PushResponse> {
  const results: PushResult[] = [];
  const writable: SyncRecordInput[] = [];

  for (const record of records) {
    if (record.updatedAt > now + MAX_CLOCK_SKEW_MS) {
      results.push({
        store: record.store,
        recordId: record.recordId,
        outcome: "rejected",
        reason: "la fecha del dispositivo está muy adelantada",
      });
      continue;
    }
    writable.push(record);
  }

  if (writable.length === 0)
    return { results, serverTime: now, accountId: userId, epoch };

  // De-duplicate within the batch, newest wins, so one request cannot contain
  // two versions of the same record and leave the outcome up to row order.
  const latest = new Map<string, SyncRecordInput>();
  for (const record of writable) {
    const key = keyOf(record.store, record.recordId);
    const seen = latest.get(key);
    if (!seen || record.updatedAt > seen.updatedAt) latest.set(key, record);
  }

  const stored = await backend.getMany(
    userId,
    [...latest.values()].map((r) => ({
      store: r.store,
      recordId: r.recordId,
    })),
  );
  const storedByKey = new Map(
    stored.map((r) => [keyOf(r.store, r.recordId), r]),
  );

  const toWrite: StoredRecord[] = [];
  for (const record of writable) {
    const key = keyOf(record.store, record.recordId);
    const existing = storedByKey.get(key);
    const accepted = serverAccepts(record.updatedAt, existing?.updatedAt);

    results.push({
      store: record.store,
      recordId: record.recordId,
      outcome: accepted ? "accepted" : "stale",
    });

    // Only the winner of the in-batch de-duplication is actually written; the
    // others already have their (identical) outcome reported above.
    if (accepted && latest.get(key) === record) {
      toWrite.push({
        userId,
        store: record.store,
        recordId: record.recordId,
        pregnancyId: record.pregnancyId ?? null,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt ?? null,
        serverUpdatedAt: now,
        payload: record.payload ?? null,
      });
    }
  }

  if (toWrite.length > 0) await backend.upsertMany(toWrite);

  return { results, serverTime: now, accountId: userId, epoch };
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

export async function pullRecords(
  backend: SyncBackend,
  userId: string,
  query: { since: number; limit?: number; cursor?: string },
  now: number,
  epoch?: number,
): Promise<PullResponse> {
  const limit = Math.min(query.limit ?? DEFAULT_PULL_LIMIT, MAX_PULL_LIMIT);
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  // `since` is a SERVER clock value — it is `serverUpdatedAt`, not the
  // client-authored `updatedAt` the merge rule compares. See the column
  // comment in schema.ts for why mixing the two loses records.
  //
  // It is inclusive: the client advances its cursor only to the highest
  // `serverUpdatedAt` it has actually received, so re-delivering that one
  // record on the next pull is the price of never skipping one. The merge
  // rule ignores an equal timestamp, so it costs nothing but bytes.
  const from = cursor
    ? {
        serverUpdatedAt: cursor.updatedAt,
        store: cursor.store,
        recordId: cursor.recordId,
      }
    : { serverUpdatedAt: query.since };

  const page = await backend.page(userId, from, limit + 1);
  const hasMore = page.length > limit;
  const rows = hasMore ? page.slice(0, limit) : page;

  const response: PullResponse = {
    records: rows.map((r) => ({
      store: r.store as SyncRecordInput["store"],
      recordId: r.recordId,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
      payload: r.payload,
      pregnancyId: r.pregnancyId,
      serverUpdatedAt: r.serverUpdatedAt,
    })),
    serverTime: now,
    accountId: userId,
    epoch,
  };

  if (hasMore) {
    const last = rows[rows.length - 1]!;
    response.nextCursor = encodeCursor({
      updatedAt: last.serverUpdatedAt,
      store: last.store,
      recordId: last.recordId,
    });
  }

  return response;
}

// ---------------------------------------------------------------------------
// Drizzle backend
// ---------------------------------------------------------------------------

export function drizzleBackend(database: Database): SyncBackend {
  return {
    async getMany(userId, keys) {
      if (keys.length === 0) return [];
      const rows = await database
        .select()
        .from(syncRecords)
        .where(
          and(
            eq(syncRecords.userId, userId),
            or(
              ...keys.map((k) =>
                and(
                  eq(syncRecords.store, k.store as never),
                  eq(syncRecords.recordId, k.recordId),
                ),
              ),
            ),
          ),
        );
      return rows.map(toStored);
    },

    async upsertMany(records) {
      if (records.length === 0) return;
      await database
        .insert(syncRecords)
        .values(
          records.map((r) => ({
            userId: r.userId,
            store: r.store as never,
            recordId: r.recordId,
            pregnancyId: r.pregnancyId,
            updatedAt: r.updatedAt,
            deletedAt: r.deletedAt,
            serverUpdatedAt: r.serverUpdatedAt,
            payload: r.payload,
          })),
        )
        // Last-write-wins is applied here, in SQL, not by reading first and
        // writing after. Two devices pushing the same record at once would
        // otherwise both read the old row and the slower write would win.
        //
        // ORDER MATTERS: MySQL evaluates these assignments left to right, so
        // every clause that compares against the stored `updatedAt` has to run
        // BEFORE `updatedAt` itself is replaced.
        .onDuplicateKeyUpdate({
          set: {
            payload: sql`if(values(${syncRecords.updatedAt}) > ${syncRecords.updatedAt}, values(${syncRecords.payload}), ${syncRecords.payload})`,
            deletedAt: sql`if(values(${syncRecords.updatedAt}) > ${syncRecords.updatedAt}, values(${syncRecords.deletedAt}), ${syncRecords.deletedAt})`,
            pregnancyId: sql`if(values(${syncRecords.updatedAt}) > ${syncRecords.updatedAt}, values(${syncRecords.pregnancyId}), ${syncRecords.pregnancyId})`,
            // The server write clock advances on every accepted write, and
            // only ever forwards — a backwards NTP step must not hide a row
            // from a client that has already pulled past that point.
            serverUpdatedAt: sql`if(values(${syncRecords.updatedAt}) > ${syncRecords.updatedAt}, greatest(values(${syncRecords.serverUpdatedAt}), ${syncRecords.serverUpdatedAt} + 1), ${syncRecords.serverUpdatedAt})`,
            updatedAt: sql`greatest(${syncRecords.updatedAt}, values(${syncRecords.updatedAt}))`,
          },
        });
    },

    async page(userId, from, limit) {
      const after =
        from.store !== undefined && from.recordId !== undefined
          ? or(
              sql`${syncRecords.serverUpdatedAt} > ${from.serverUpdatedAt}`,
              and(
                eq(syncRecords.serverUpdatedAt, from.serverUpdatedAt),
                or(
                  sql`${syncRecords.store} > ${from.store}`,
                  and(
                    sql`${syncRecords.store} = ${from.store}`,
                    sql`${syncRecords.recordId} > ${from.recordId}`,
                  ),
                ),
              ),
            )
          : gte(syncRecords.serverUpdatedAt, from.serverUpdatedAt);

      const rows = await database
        .select()
        .from(syncRecords)
        .where(and(eq(syncRecords.userId, userId), after))
        .orderBy(
          asc(syncRecords.serverUpdatedAt),
          asc(syncRecords.store),
          asc(syncRecords.recordId),
        )
        .limit(limit);

      return rows.map(toStored);
    },
  };
}

function toStored(row: typeof syncRecords.$inferSelect): StoredRecord {
  return {
    userId: row.userId,
    store: row.store,
    recordId: row.recordId,
    pregnancyId: row.pregnancyId,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    serverUpdatedAt: row.serverUpdatedAt,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
  };
}
