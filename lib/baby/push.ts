// Growth plan item 9 ("Ya nació", G3) — the baby-age notice.
//
// After the birth, the weekly "semana nueva" poke becomes "Tu bebé cumple…":
// every week for the first 8 weeks, then on each monthly birthday up to the
// first year. Same `consejos` category and opt-in as before, and the same B5
// shape: the device computes WHEN (a list of instants for the server) and the
// service worker writes the words from IndexedDB when the poke lands. The
// server never learns that a baby was born.

import { WEEKLY_TIP_COUNT, WEEKLY_TIP_HOUR } from "@/lib/push/weekly";
import type { NotificationText } from "@/lib/push/sentences";
import { WEEKS_UNTIL, babyAge, babyAgeLabel, localDay } from "./age";

/** The last birthday that gets a notice: the first year. */
export const LAST_NOTICE_MONTH = 12;

/** The local day, `months` calendar months after `birth` (31st → last day). */
function monthBirthday(birth: number, months: number): Date {
  const b = new Date(localDay(birth));
  const target = new Date(b.getFullYear(), b.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(b.getDate(), lastDay));
  return target;
}

/** Every notice day of the first year, at WEEKLY_TIP_HOUR local, oldest first. */
function allNoticeTimes(birthDate: number): number[] {
  const times: number[] = [];
  const born = new Date(localDay(birthDate));
  for (let week = 1; week <= WEEKS_UNTIL; week += 1) {
    const day = new Date(born);
    day.setDate(day.getDate() + week * 7);
    day.setHours(WEEKLY_TIP_HOUR, 0, 0, 0);
    times.push(day.getTime());
  }
  const lastWeekly = times[times.length - 1]!;
  for (let month = 1; month <= LAST_NOTICE_MONTH; month += 1) {
    const day = monthBirthday(birthDate, month);
    day.setHours(WEEKLY_TIP_HOUR, 0, 0, 0);
    // Months that fall inside the weekly stretch are already covered by it.
    if (day.getTime() > lastWeekly) times.push(day.getTime());
  }
  return times;
}

/** The next `count` notice instants after `now`. Empty after the first birthday. */
export function babyAgeTimes(
  birthDate: number,
  now: number = Date.now(),
  count: number = WEEKLY_TIP_COUNT,
): number[] {
  return allNoticeTimes(birthDate)
    .filter((at) => at > now)
    .slice(0, count);
}

/** One line per stage: what the notice says under the age. */
function stageLine(months: number): string {
  if (months < 3) return "Pecho a demanda y a dormir siempre boca arriba. Mirá lo de esta etapa en Mi Bebé.";
  if (months < 6) return "Llevá la libreta de vacunación al próximo control. Tocá para ver lo de esta etapa.";
  if (months < 9) return "Desde los 6 meses se suman otros alimentos, sin dejar el pecho. Tocá para ver más.";
  return "Casi un año juntos. Tocá para ver lo de esta etapa.";
}

/**
 * The notice text for a baby born on `birthDate`, at `now`.
 *
 * "cumple" only on the day itself; a poke that lands on another day (an old
 * queue, a late delivery) says "tiene" instead of claiming a birthday.
 */
export function babyAgeSentence(birthDate: number, now: number = Date.now()): NotificationText {
  const age = babyAge(birthDate, now);
  const label = babyAgeLabel(age);
  const today = localDay(now);
  const isBirthday = allNoticeTimes(birthDate).some((at) => localDay(at) === today);
  return {
    title: isBirthday ? `¡Tu bebé cumple ${label}!` : `Tu bebé tiene ${label}`,
    body: stageLine(age.months),
  };
}
