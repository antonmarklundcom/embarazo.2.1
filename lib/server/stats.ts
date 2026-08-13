import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "./db";
import { contentStats } from "./schema";
import {
  POPULAR_LIMIT,
  dayKey,
  windowDays,
  type PopularItem,
} from "@/lib/stats/contentStats";

// BUILD-PLAN C7 — the counter, server side.
//
// Two functions, and neither of them takes a user. That is not an omission to
// be fixed later: `contentStats` has no identity column (A1), and if a future
// counter needs to know "who", it does not belong in this table.
//
// The week column is written as 0 — "not applicable" — because the client never
// sends a week. See `lib/stats/contentStats.ts` for why.

/** The bucket a view is counted in when the reader's week is not known. */
const NO_WEEK = 0;

/**
 * Count one view of `contentId` today.
 *
 * An upsert rather than read-modify-write: two readers opening the same guía
 * in the same second must both be counted, and MySQL's
 * `ON DUPLICATE KEY UPDATE` is the only version of that which does not need a
 * transaction or a lock.
 */
export async function recordView(
  database: Database,
  contentId: string,
  now: Date = new Date(),
): Promise<void> {
  await database
    .insert(contentStats)
    .values({ week: NO_WEEK, contentId, day: dayKey(now), views: 1 })
    .onDuplicateKeyUpdate({
      set: { views: sql`${contentStats.views} + 1` },
    });
}

/** The most-read content of the last seven days. */
export async function popularContent(
  database: Database,
  now: Date = new Date(),
  limit: number = POPULAR_LIMIT,
): Promise<PopularItem[]> {
  const rows = await database
    .select({
      contentId: contentStats.contentId,
      views: sql<number>`sum(${contentStats.views})`.as("views"),
    })
    .from(contentStats)
    .where(
      and(
        inArray(contentStats.day, windowDays(now)),
        eq(contentStats.week, NO_WEEK),
      ),
    )
    .groupBy(contentStats.contentId)
    .orderBy(desc(sql`views`))
    .limit(limit);

  return rows.map((row) => ({
    contentId: row.contentId,
    views: Number(row.views),
  }));
}
