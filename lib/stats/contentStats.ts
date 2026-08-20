import { z } from "zod";

import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";

// BUILD-PLAN C7 — "lo más leído" (feature map #16), pure half.
// **Amended by K5 (docs/FABLE-PLAN-2026-08.md §3, §7).**
//
// This is the app's only aggregate counter. The wire format is defined here,
// once, and after K5 it carries **two fields**: which piece of content was
// opened, and which pregnancy week the reader is in.
//
// ## Why the week came back
//
// J3 stripped it, along with the week and department on `/go` and `/directory`,
// to buy an honest **"No data collected"** badge on the Play listing. §5 D2
// gave that badge up: the app has accounts, sync and family sharing now, so the
// declaration is honest either way and the badge can no longer veto a product
// decision. What J3 cost here was the feature's whole point — "lo más leído
// **esta semana**" meant "in the last seven days", not "by women as far along
// as you", and the second is the one worth reading.
//
// K5 restores it **here and nowhere else**. `/go` and `/directory` stay
// parameterless: their offline single-cache-key design is better on its own
// merits, not only for the badge, and the plan says so explicitly.
//
// ## What is still deliberately NOT on the wire
//
//   * **No user id, no session, no device id.** `contentStats` has no identity
//     column by design (ARCHITECTURE.md §4.5, asserted since A1), and §4.5's
//     rule — "aggregate stats are never joined to a user" — is untouched by
//     this change. A week is not an identity; the row is
//     `(week, content_id, day, count)` and always was.
//   * **No IP retained.** The rate limiter holds one in memory for a minute;
//     nothing about the request reaches the database.
//   * **No timestamp finer than a day.** Daily buckets, so no sequence of rows
//     can be read as one person's session. This matters *more* now: a week plus
//     a minute-resolution timestamp starts to look like a person, and a week
//     plus a day bucket does not.
//   * **Nothing on the GET.** See `WEEK_BUCKET_SPAN` below — the read side is
//     still parameterless, which is what keeps one cache key for everybody.

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
export const RecordViewSchema = z
  .object({
    contentId: ContentIdSchema,
    /**
     * K5 — the reader's pregnancy week, or absent.
     *
     * Optional rather than required, because the counter must keep working for
     * a reader who has none: somebody in `planeando` mode, somebody reading
     * `/conoce` before onboarding, a companion. Those views count in bucket
     * `0`, which is what `NO_WEEK` has always meant.
     *
     * Bounded to the app's own range so the column cannot be used as a
     * general-purpose integer store.
     */
    week: z.number().int().min(MIN_WEEK).max(MAX_WEEK).optional(),
  })
  .strict();
export type RecordView = z.infer<typeof RecordViewSchema>;

/** Rows the GET returns, most-read first. */
export interface PopularItem {
  contentId: string;
  views: number;
}

/**
 * K5 (§7) — how wide a week bucket is when the GET groups them.
 *
 * The read side stays **parameterless**, which is the design constraint that
 * matters: one URL, one cache key, one precached answer for everybody, exactly
 * as J3 left it. A `?week=` would give every reader their own cache entry and
 * quietly put a health datum in a URL that proxies and logs can see.
 *
 * So the GET returns the top N **for every bucket, in one payload**, and the
 * client picks its own. Buckets rather than single weeks because 42 rows of
 * three is a payload nobody needs and because women four weeks apart are
 * reading the same things: 6-week spans approximate trimesters without
 * pretending week 13 and week 14 are different worlds.
 *
 * Bucket 0 is "no week" — see `RecordViewSchema.week`.
 */
export const WEEK_BUCKET_SPAN = 6;

/** The bucket a week falls in. `null`/undefined → 0, "not applicable". */
export function weekBucket(week: number | null | undefined): number {
  if (typeof week !== "number" || !Number.isFinite(week)) return 0;
  if (week < MIN_WEEK) return 0;
  const clamped = Math.min(week, MAX_WEEK);
  return Math.floor((clamped - MIN_WEEK) / WEEK_BUCKET_SPAN) + 1;
}

/** The GET's shape: top-N per bucket, plus the all-weeks list as bucket 0. */
export interface PopularByBucket {
  bucket: number;
  items: PopularItem[];
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
