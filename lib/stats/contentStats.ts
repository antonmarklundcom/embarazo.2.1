import { z } from "zod";

// BUILD-PLAN C7 — "lo más leído" (feature map #16), pure half.
//
// This is the app's only aggregate counter, and the one place where a
// well-meaning "just add the week so we can segment it" would undo J3. So the
// wire format is defined here, once, and it carries **one field**: which piece
// of content was opened.
//
// What is deliberately NOT on the wire, and why:
//
//   * **No user id, no session, no device id.** `contentStats` has no identity
//     column by design (ARCHITECTURE.md §4.5, asserted since A1).
//   * **No IP retained.** The rate limiter holds one in memory for a minute;
//     nothing about the request reaches the database.
//   * **No pregnancy week.** It is derived from the due date, which makes it
//     health data. J3 removed exactly this parameter from three other routes so
//     the Play listing can keep saying "No data collected"
//     (`docs/ANDROID-LAUNCH.md` §3.1); a new route may not put it back. The
//     `contentStats.week` column stays as A1 defined it and is written as `0`
//     — "not applicable" — which is the honest value for a counter that does
//     not know.
//   * **No timestamp finer than a day.** Daily buckets, so no sequence of rows
//     can be read as one person's session.

/** Content ids are our own slugs: `senales-de-alarma-embarazo`, `sem-24`… */
export const ContentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "contentId inválido: minúsculas, números y guiones",
  );

/**
 * The whole POST body. `.strict()` matters more than usual here: it is what
 * turns "somebody added a week field" from a silent privacy regression into a
 * 400 the first time it is sent.
 */
export const RecordViewSchema = z.object({ contentId: ContentIdSchema }).strict();
export type RecordView = z.infer<typeof RecordViewSchema>;

/** Rows the GET returns, most-read first. */
export interface PopularItem {
  contentId: string;
  views: number;
}

/** How many the home rail shows, and the cap the query applies. */
export const POPULAR_LIMIT = 3;

/** Days counted as "esta semana". */
export const POPULAR_WINDOW_DAYS = 7;

/** "YYYY-MM-DD" in UTC — the daily bucket key. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The `POPULAR_WINDOW_DAYS` bucket keys ending today, most recent first. */
export function windowDays(now: Date, days: number = POPULAR_WINDOW_DAYS): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    keys.push(dayKey(new Date(now.getTime() - i * 86_400_000)));
  }
  return keys;
}
