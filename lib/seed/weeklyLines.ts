import { WeeklyLineSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { WeeklyLine } from "../types";
import rawLines from "./weeklyLines.json";

// BUILD-PLAN C2 — the weekly one-liner (feature map #11).
//
// One concrete "what is happening now" sentence per week, in es-PY voseo. It
// is deliberately NOT the same thing as `milestone` in `lib/weeks.ts`: that is
// a paragraph for the week detail page, this is the single line the home
// screen leads with under the hero.
//
// **The fallback is the point.** BUILD-PLAN asks for 42 strings *and* for the
// code to ship without them, because content lands on a different schedule
// than code. `weeklyLine()` returns `null` for anything it does not have, and
// the home block renders nothing at all rather than an empty card or a
// "próximamente" — a gap the user cannot see is better than a promise.
//
// G1 content ops: the strings live in `weeklyLines.json`, validated here at
// import time and again in `npm run validate:content`, so a founder or a
// Gemini-assisted edit can rewrite a week without touching TypeScript.

const { valid, errors } = validateContentArray(
  "lib/seed/weeklyLines.json",
  rawLines as unknown[],
  WeeklyLineSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/weeklyLines.json:\n${errors.join("\n")}`,
  );
}

/**
 * Z1's placeholder gate, applied here too.
 *
 * These are real editorial strings, not invented businesses, so nothing is
 * filtered today. It costs one call and it means a week left as
 * "(placeholder) escribir esto" during a content pass falls back to showing
 * nothing, which is exactly what the fallback exists for.
 */
export const PUBLISHED_WEEKLY_LINES: WeeklyLine[] = publishedOnly(valid);

const BY_WEEK = new Map(PUBLISHED_WEEKLY_LINES.map((entry) => [entry.week, entry.line]));

/** The line for a week, or `null` when there isn't one yet. */
export function weeklyLine(week: number): string | null {
  return BY_WEEK.get(week) ?? null;
}
