// BUILD-PLAN F2 — quota & cost control, pure half.
//
// F1 shipped a pipeline that spends real money per call and is one env var away
// from doing it without a ceiling. This module is the arithmetic that stops it,
// kept pure and free of any direct environment read for the same reason
// `babyImage.ts` is: it is imported by the client screen (to say "te quedan 2 de
// 3"), and a module a client component imports must never reach for a secret.
//
// Two independent limits, because they fail differently:
//
//   * the **per-user monthly quota** stops one person burning the budget, and
//   * the **global monthly spend ceiling** stops a thousand people doing it
//     between one look at the dashboard and the next.
//
// Both are env vars so either can be cut without a deploy (BUILD-PLAN F2), and
// both fail **closed**: an unset, malformed or negative value falls back to the
// conservative default rather than to "unlimited". A typo in a Hostinger env
// field must not be able to mean "spend whatever you like".

import type { AiEnv } from "./babyImage";

/** Per user, per calendar month (UTC). BUILD-PLAN F2: ≈$0.12/user/month. */
export const DEFAULT_MONTHLY_QUOTA = 3;

/**
 * Global monthly ceiling, in USD, when nothing is configured.
 *
 * BUILD-PLAN F2 sizes 1 000 maxed-out users at ≈$120/month. $50 is deliberately
 * *below* that: the default is what protects a deployment where somebody
 * enabled the feature and forgot the ceiling, and in that situation stopping
 * early is the correct failure.
 */
export const DEFAULT_CEILING_USD = 50;

const MICROS_PER_USD = 1_000_000;

/**
 * Generations one user may run this month.
 *
 * `0` is a legitimate value — it is the softest kill switch there is, turning
 * the feature off for everyone without touching `AI_BABY_ENABLED` or breaking
 * the screen that explains what the feature is.
 */
export function aiBabyMonthlyQuota(env: AiEnv): number {
  const raw = numberOrNull(env.AI_BABY_MONTHLY_QUOTA);
  return raw === null ? DEFAULT_MONTHLY_QUOTA : Math.floor(raw);
}

/** The global ceiling in micros, from a USD env var written by a human. */
export function aiBabySpendCeilingMicros(env: AiEnv): number {
  const usd = numberOrNull(env.AI_BABY_MONTHLY_SPEND_CEILING_USD);
  return Math.round((usd ?? DEFAULT_CEILING_USD) * MICROS_PER_USD);
}

/**
 * A finite, non-negative number, or `null` for "not configured".
 *
 * An **empty** variable is "not configured", not zero — `.env.example` ships
 * these keys with empty values, and reading that as `0` would turn a
 * half-filled env file into a feature that is silently off for everyone rather
 * than one running on its documented defaults. Zero stays a legitimate
 * *explicit* value; it just has to be typed.
 */
function numberOrNull(raw: string | undefined): number | null {
  const text = raw?.trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

export interface QuotaState {
  /** This user's generations this calendar month, **including the one being
   * asked for right now**. See `committedMicros` for why that matters. */
  used: number;
  quota: number;
  /** Every dollar this month already spent or in flight, in micros, likewise
   * including the request being decided. */
  committed: number;
  ceiling: number;
}

export type QuotaVerdict = "ok" | "ceiling-exceeded" | "quota-exceeded";

/**
 * Both counts include the request under consideration, so this is a plain
 * `>` — the caller reserves first and asks second (see `lib/server/aiBaby.ts`),
 * which is what makes two simultaneous requests unable to slip past a limit
 * they would each individually respect.
 *
 * The ceiling is checked first on purpose. If the global budget is gone, "ya
 * usaste tus 3 imágenes" would be a lie: the user has generations left and
 * still cannot generate, and next month will not fix it.
 */
export function quotaVerdict(state: QuotaState): QuotaVerdict {
  if (state.committed > state.ceiling) return "ceiling-exceeded";
  if (state.used > state.quota) return "quota-exceeded";
  return "ok";
}

/**
 * Money spent or promised this month.
 *
 * A `pending` row is a generation that has been sent to the model and has not
 * come back. It has no recorded cost yet and it may well have one, so it counts
 * at the configured per-image price. Counting only completed rows would let a
 * burst of simultaneous requests spend past the ceiling while every one of them
 * reads a spend total from before the burst.
 */
export function committedMicros(input: {
  succeededMicros: number;
  pendingCount: number;
  costMicros: number;
}): number {
  return input.succeededMicros + input.pendingCount * input.costMicros;
}

/** What the screen shows. Never negative, even if a limit was lowered. */
export function remainingGenerations(used: number, quota: number): number {
  return Math.max(0, quota - used);
}
