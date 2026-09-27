import "server-only";

import { gte, sql } from "drizzle-orm";

import type { Database } from "./db";
import { funnelStats } from "./schema";
import { dayKey } from "@/lib/stats/contentStats";
import type { FunnelEvent, FunnelRow } from "@/lib/stats/funnel";

// Growth plan items 16–18, server side. Two functions, and neither takes a
// user: `recordFunnel` has no parameter to pass an id, a session or an IP
// into, so adding one means changing this signature — the moment somebody
// should have to argue for it (the rule `placementClicks.ts` states).

/**
 * Count one event today. Upsert, for the reason `recordView` gives: two
 * installs arriving in the same second must both be counted.
 */
export async function recordFunnel(
  database: Database,
  event: FunnelEvent,
  now: Date = new Date(),
): Promise<void> {
  await database
    .insert(funnelStats)
    .values({ metric: event.metric, key: event.key, day: dayKey(now), count: 1 })
    .onDuplicateKeyUpdate({
      set: { count: sql`${funnelStats.count} + 1` },
    });
}

/**
 * Every row of the last `days` days. The whole window is read and grouped in
 * `weeklyFunnel` / `totalsByKey`: a week is a reporting decision, and the table
 * is small by construction (five metrics, a handful of keys, one row a day).
 */
export async function funnelRows(
  database: Database,
  days = 70,
  now: Date = new Date(),
): Promise<FunnelRow[]> {
  const since = dayKey(new Date(now.getTime() - days * 86_400_000));
  const rows = await database
    .select({
      metric: funnelStats.metric,
      key: funnelStats.key,
      day: funnelStats.day,
      count: funnelStats.count,
    })
    .from(funnelStats)
    .where(gte(funnelStats.day, since));
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}
