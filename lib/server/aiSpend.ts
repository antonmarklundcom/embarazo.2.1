import "server-only";

import { eq } from "drizzle-orm";

import type { Database } from "./db";
import { aiGenerations } from "./schema";
import { aiBabyMonthlyQuota, aiBabySpendCeilingMicros } from "@/lib/ai/quota";
import type { AiEnv } from "@/lib/ai/babyImage";
import { quotaMonthOf } from "./aiBaby";

// BUILD-PLAN I4 — AI usage & spend, metadata only.
//
// "Metadata only" is not a figure of speech: `aiGenerations` has no column
// for a prompt or a photo (F1 never stores them — see its header), so there is
// nothing here to accidentally select even if a future edit tried. This file
// reads `userId`, `status` and `costUsdMicros` and nothing else, for the
// current UTC month and the previous one — "what did AI cost this month" is a
// question about money and counts, not about what anyone typed or uploaded.

const MICROS_PER_USD = 1_000_000;

export interface GenerationRow {
  userId: string;
  status: "pending" | "succeeded" | "failed";
  costUsdMicros: number | null;
}

export interface AiSpendStore {
  rowsForMonth(month: string): Promise<GenerationRow[]>;
}

export function drizzleAiSpendStore(database: Database): AiSpendStore {
  return {
    async rowsForMonth(month) {
      return database
        .select({
          userId: aiGenerations.userId,
          status: aiGenerations.status,
          costUsdMicros: aiGenerations.costUsdMicros,
        })
        .from(aiGenerations)
        .where(eq(aiGenerations.quotaMonth, month));
    },
  };
}

export interface MonthSpend {
  /** "YYYY-MM" (UTC), same convention as `quotaMonthOf`. */
  month: string;
  ok: number;
  failed: number;
  pending: number;
  spendUsd: number;
  ceilingUsd: number;
  /** `spendUsd / ceilingUsd`, 0 when the ceiling is 0. Never divides by zero. */
  spendShare: number;
  /** Users with at least one non-failed generation this month. */
  distinctUsers: number;
  /** Of those, how many are at or past the quota. */
  usersAtQuota: number;
  quota: number;
}

/**
 * Pure: the arithmetic over one month's rows, no database in sight. This is
 * what a test exercises directly, the same way `quotaVerdict` is tested
 * separately from `generateBabyImage`.
 */
export function summariseMonth(
  month: string,
  rows: GenerationRow[],
  quota: number,
  ceilingUsd: number,
): MonthSpend {
  let ok = 0;
  let failed = 0;
  let pending = 0;
  let spendMicros = 0;
  // Same rule as `QuotaStore.countForUser`: a failed generation spent nothing
  // and did not use anyone's month, so it does not count toward "how many
  // users" or "who is at quota" either.
  const perUser = new Map<string, number>();

  for (const row of rows) {
    if (row.status === "succeeded") ok += 1;
    else if (row.status === "failed") failed += 1;
    else pending += 1;

    spendMicros += row.costUsdMicros ?? 0;

    if (row.status !== "failed") {
      perUser.set(row.userId, (perUser.get(row.userId) ?? 0) + 1);
    }
  }

  const spendUsd = spendMicros / MICROS_PER_USD;
  const usersAtQuota = [...perUser.values()].filter((count) => count >= quota).length;

  return {
    month,
    ok,
    failed,
    pending,
    spendUsd,
    ceilingUsd,
    spendShare: ceilingUsd > 0 ? spendUsd / ceilingUsd : 0,
    distinctUsers: perUser.size,
    usersAtQuota,
    quota,
  };
}

function previousMonthOf(now: Date): string {
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return quotaMonthOf(previous);
}

/** Current UTC month first, previous month second. */
export async function aiSpendReport(
  store: AiSpendStore,
  now: Date = new Date(),
): Promise<MonthSpend[]> {
  const quota = aiBabyMonthlyQuota(process.env);
  const ceilingUsd = aiBabySpendCeilingMicros(process.env) / MICROS_PER_USD;
  const months = [quotaMonthOf(now), previousMonthOf(now)];

  const rowsByMonth = await Promise.all(months.map((month) => store.rowsForMonth(month)));
  return months.map((month, i) => summariseMonth(month, rowsByMonth[i]!, quota, ceilingUsd));
}

/**
 * Share of the ceiling that trips the alert banner. Same fail-closed shape as
 * `lib/ai/quota.ts`'s env readers: unset, empty or malformed falls back to
 * the conservative default rather than never alerting.
 */
export const DEFAULT_ALERT_SHARE = 0.8;

export function aiBabyAlertShare(env: AiEnv): number {
  const raw = env.AI_BABY_ALERT_SHARE?.trim();
  if (!raw) return DEFAULT_ALERT_SHARE;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_ALERT_SHARE;
}
