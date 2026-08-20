// PR-5b — the weekly `consejos` schedule (docs/FABLE-PLAN-2026-08.md §7).
//
// "Consejos de la semana" has been a toggle in Ajustes since B5 with **nothing
// behind it**: the category existed, the opt-in was stored, and no code
// anywhere ever enqueued a single one. A switch that does nothing is worse
// than an absent feature, because the user has already decided to trust it.
//
// This is the generator, and it is payload-free in exactly B5's sense: the
// device computes *when* it wants to be poked and the server learns a list of
// epoch milliseconds. It is never told that these are weekly tips, what week
// she is in, or what the notification will say — the service worker writes the
// sentence from IndexedDB when the poke lands (app/sw.ts).
//
// Pure and dependency-free so the slot arithmetic is testable without a
// database, a clock or a browser.

/** Local hour the weekly tip lands on. */
export const WEEKLY_TIP_HOUR = 10;

/**
 * How many weeks are enqueued at a time.
 *
 * The route caps a schedule at 60 entries and 400 days, so this could be much
 * larger. It is twelve because the list is *replaced* on every publish and
 * every app open re-publishes it (`refreshReminders`): a long queue is not
 * more reliable, it is just more rows to rewrite. Twelve weeks is long enough
 * that somebody who does not open the app for two months still gets poked, and
 * short enough that a woman who gives birth in week 39 is not carrying a year
 * of pregnancy tips behind her.
 */
export const WEEKLY_TIP_COUNT = 12;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The next `count` weekly slots, as epoch milliseconds.
 *
 * The slot is 10:00 **local time**, on the same weekday as `now`. Local
 * because a tip that arrives at 06:00 in Asunción is a tip that arrives while
 * she is asleep, and the server cannot know her timezone — it only ever
 * receives the instants this function produces, which is the point.
 *
 * The first slot is today's if today's has not passed yet, otherwise next
 * week's. It never returns a time in the past: the dispatcher fires everything
 * whose `fireAt` has gone by, so a stale entry is not a skipped tip, it is an
 * immediate one.
 */
export function weeklyTipTimes(
  now: number = Date.now(),
  count: number = WEEKLY_TIP_COUNT,
): number[] {
  const first = new Date(now);
  first.setHours(WEEKLY_TIP_HOUR, 0, 0, 0);
  let start = first.getTime();
  if (start <= now) start += 7 * MS_PER_DAY;

  const times: number[] = [];
  for (let i = 0; i < count; i += 1) {
    // Re-derived through `Date` on each step rather than added as a fixed
    // 7-day span: Paraguay observes DST, and adding 604 800 000 ms across the
    // October or March change would walk the tip an hour off and keep it
    // there.
    const slot = new Date(start);
    slot.setDate(slot.getDate() + i * 7);
    slot.setHours(WEEKLY_TIP_HOUR, 0, 0, 0);
    times.push(slot.getTime());
  }
  return times;
}
