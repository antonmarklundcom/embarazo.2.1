import "server-only";

import { inArray, sql } from "drizzle-orm";

import type { Database } from "./db";
import { contentStats } from "./schema";
import {
  POPULAR_LIMIT,
  dayKey,
  weekBucket,
  windowDays,
  type PopularByBucket,
} from "@/lib/stats/contentStats";

// BUILD-PLAN C7 — the counter, server side. **Amended by K5.**
//
// Two functions, and neither of them takes a user. That is not an omission to
// be fixed later: `contentStats` has no identity column (A1), and if a future
// counter needs to know "who", it does not belong in this table. K5 changes
// what a row *says*, never who it is about.
//
// The `week` column has existed since A1 and was written as a constant 0
// because J3 had removed the week from the wire. It now holds the reader's
// week when they have one, and 0 — "not applicable" — when they do not. See
// `lib/stats/contentStats.ts` for why the badge no longer vetoes this.

/** The value written when the reader's week is not known. */
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
  week: number | null | undefined = null,
  now: Date = new Date(),
): Promise<void> {
  await database
    .insert(contentStats)
    // K5: the reader's own week, not a bucket. Buckets are a *read*-side
    // grouping (see `popularContent`), and storing the raw week keeps the
    // bucket width a decision that can change without a migration or a
    // re-count. `week` is already bounded by the route's zod schema; a
    // non-number lands in 0, which is what "we do not know" has always meant.
    .values({
      week: typeof week === "number" ? week : NO_WEEK,
      contentId,
      day: dayKey(now),
      views: 1,
    })
    .onDuplicateKeyUpdate({
      set: { views: sql`${contentStats.views} + 1` },
    });
}

/**
 * The most-read content of the last seven days, everywhere and per week bucket.
 *
 * K5 (§7): **one query, one payload, one cache key.** The GET stays
 * parameterless — a `?week=` would give every reader their own cache entry and
 * put a health datum in a URL — so the server returns the top N for every
 * bucket and the client selects its own. Buckets are computed here, in SQL's
 * output rather than in SQL, because the bucket width is a product decision
 * (`WEEK_BUCKET_SPAN`) and grouping in the query would bake it into the plan.
 *
 * Bucket 0 is returned too, and it is not "readers with no week": it is
 * **everybody**, which is what the rail falls back to when a bucket is too
 * quiet to rank. A bucket with two rows in it would otherwise present one
 * woman's afternoon as what everyone is reading.
 */
export async function popularContent(
  database: Database,
  now: Date = new Date(),
  limit: number = POPULAR_LIMIT,
): Promise<PopularByBucket[]> {
  const rows = await database
    .select({
      contentId: contentStats.contentId,
      week: contentStats.week,
      views: sql<number>`sum(${contentStats.views})`.as("views"),
    })
    .from(contentStats)
    .where(inArray(contentStats.day, windowDays(now)))
    .groupBy(contentStats.contentId, contentStats.week);

  return rankByBucket(
    rows.map((row) => ({
      contentId: row.contentId,
      week: row.week,
      views: Number(row.views),
    })),
    limit,
  );
}

/**
 * Pure, and exported for its own test: the grouping is the interesting half
 * and it should not need a MySQL to check.
 */
export function rankByBucket(
  rows: { contentId: string; week: number; views: number }[],
  limit: number = POPULAR_LIMIT,
): PopularByBucket[] {
  const totals = new Map<number, Map<string, number>>();

  const add = (bucket: number, contentId: string, views: number) => {
    const forBucket = totals.get(bucket) ?? new Map<string, number>();
    forBucket.set(contentId, (forBucket.get(contentId) ?? 0) + views);
    totals.set(bucket, forBucket);
  };

  for (const row of rows) {
    // Bucket 0 = everybody, so every row counts twice: once in its own bucket
    // and once in the fallback.
    add(0, row.contentId, row.views);
    const bucket = weekBucket(row.week);
    if (bucket !== 0) add(bucket, row.contentId, row.views);
  }

  return [...totals.entries()]
    .map(([bucket, counts]) => ({
      bucket,
      items: [...counts.entries()]
        .map(([contentId, views]) => ({ contentId, views }))
        // Ties broken by id so the payload — and its cache entry — is stable
        // rather than reshuffling on every request.
        .sort((a, b) => b.views - a.views || a.contentId.localeCompare(b.contentId))
        .slice(0, limit),
    }))
    .sort((a, b) => a.bucket - b.bucket);
}
