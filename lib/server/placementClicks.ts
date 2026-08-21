import "server-only";

import { sql } from "drizzle-orm";

import type { Database } from "./db";
import { dbOrNull } from "./db";
import { placementClicks } from "./schema";
import { dayKey } from "@/lib/stats/contentStats";
import {
  monthKey,
  summariseClicks,
  type ClickRow,
  type PlacementMonth,
} from "@/lib/stats/placementReport";

// FABLE-PLAN K15 — sponsor click reporting, server side.
//
// §5 D3 scopes this to **reporting only**: a count the founder can read in
// `/admin/patrocinios`, so "what did placement X get in month Y" is answerable
// without a spreadsheet, an export or a sponsor login. There is no sponsor
// role and no portal — revisit a read-only sponsor login at ~10 paying
// sponsors, not before.
//
// Two properties are structural rather than promised, and both are asserted in
// `placementClicks.test.ts`:
//
//   1. **No per-user row exists by construction.** `recordClick` takes an id
//      and a clock, and nothing else. There is no parameter to pass a user, a
//      session or an IP into, so a future caller cannot add one without
//      changing this signature — which is the moment somebody should have to
//      argue for it.
//   2. **A click never delays or breaks the redirect.** The insert is awaited
//      by nobody and its failure is swallowed. A woman tapping "WhatsApp" on a
//      sanatorio's listing is mid-errand; a counter that makes that tap slower
//      — or worse, that 500s it when the database is down — has inverted its
//      own importance.

/**
 * Count one tap of `id` today.
 *
 * Upsert rather than read-modify-write, for the reason `recordView` gives: two
 * people tapping the same listing in the same second must both be counted, and
 * `ON DUPLICATE KEY UPDATE` is the only version of that needing no transaction.
 */
export async function recordClick(
  database: Database,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  await database
    .insert(placementClicks)
    .values({ placementId: id, day: dayKey(now), clicks: 1 })
    .onDuplicateKeyUpdate({
      set: { clicks: sql`${placementClicks.clicks} + 1` },
    });
}

/**
 * Fire-and-forget wrapper for the `/go` route.
 *
 * Returns nothing and awaits nothing: see property 2 above. Runs without a
 * database configured (local-only mode, and every `npm run build`), because
 * `dbOrNull()` is null there and there is simply nothing to count.
 */
export function countClick(id: string, now: Date = new Date()): void {
  const database = dbOrNull();
  if (!database) return;
  void recordClick(database, id, now).catch(() => {});
}

/**
 * Every (placement, month) pair with at least one click, newest month first.
 *
 * The grouping is done in `summariseClicks` rather than in SQL for the reason
 * `popularContent` gives about buckets: a month is a *reporting* decision, and
 * the day rows are what the table owes. The whole table is read because it is
 * small by construction — one row per sponsor per day, five sponsors, 365 days
 * a year is under two thousand rows — and because the alternative is a
 * date-range parameter the page has no use for.
 */
export async function clicksByMonth(database: Database): Promise<PlacementMonth[]> {
  const rows = await database
    .select({
      placementId: placementClicks.placementId,
      day: placementClicks.day,
      clicks: placementClicks.clicks,
    })
    .from(placementClicks);

  return summariseClicks(
    rows.map((row): ClickRow => ({
      placementId: row.placementId,
      day: row.day,
      clicks: Number(row.clicks),
    })),
  );
}

export { monthKey, summariseClicks };
export type { ClickRow, PlacementMonth };
