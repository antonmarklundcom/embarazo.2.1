import "server-only";

import { inArray, sql } from "drizzle-orm";

import type { DailyQuestion } from "@/lib/content/schemas";
import { pollContentId, tallyByTrimester, type PollResults } from "@/lib/poll/dailyPoll";

import type { Database } from "./db";
import { contentStats } from "./schema";
import { recordView } from "./stats";

// "Pregunta del día", server side. No new table and no migration: an answer is
// one increment of `contentStats` under `poll-<questionId>-<optionKey>`, through
// the same `recordView` upsert a content view uses. Neither function takes a
// user, for the reason in lib/server/stats.ts.
//
// The caller (app/api/v1/poll) has already checked that the pair is published;
// these functions take a `DailyQuestion` from the published list, never a raw
// string from the wire, so a counter id is only ever built from our own list.

/** Count one answer today, in her week (or 0 when she has none). */
export async function recordPollAnswer(
  database: Database,
  question: DailyQuestion,
  optionKey: string,
  week: number | null | undefined,
): Promise<void> {
  await recordView(database, pollContentId(question.id, optionKey), week ?? null);
}

/**
 * Counts per option and trimester for one question, summed over every day.
 * Exact ids (`IN`), not a `LIKE` on the prefix: `poll-nombre-` would also
 * match a later question called `nombre-guarani`.
 */
export async function pollResults(
  database: Database,
  question: DailyQuestion,
): Promise<PollResults> {
  const ids = question.options.map((option) => pollContentId(question.id, option.key));
  const rows = await database
    .select({
      contentId: contentStats.contentId,
      week: contentStats.week,
      views: sql<number>`sum(${contentStats.views})`.as("views"),
    })
    .from(contentStats)
    .where(inArray(contentStats.contentId, ids))
    .groupBy(contentStats.contentId, contentStats.week);

  return tallyByTrimester(
    question,
    rows.map((row) => ({ contentId: row.contentId, week: row.week, views: Number(row.views) })),
  );
}
