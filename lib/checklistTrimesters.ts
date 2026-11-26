import type { Trimester } from "./types";
import { getTrimester } from "./pregnancy.ts";
import { getWeek } from "./weeks.ts";

// The Checklist tab's view by trimester. It adds no content: each item is the
// "Para hacer esta semana" tip of one week in lib/weeks.ts, quoted as it is,
// and links back to that week's page. Picking a week here only says "this tip
// is a to-do", so a change to the tip's wording shows up here by itself.
//
// Weeks left out are the ones whose tip is a description or a conditional
// warning rather than something to do (week 1 is for before the pregnancy,
// week 7 only applies if the nausea is severe, week 29 is an alarm that
// already lives in Emergencia), so the list stays a list of things to do.

const TO_DO_WEEKS: readonly number[] = [
  // Primer trimestre
  3, 4, 8, 11, 13,
  // Segundo trimestre
  18, 20, 21, 23, 24, 26, 27,
  // Tercer trimestre
  28, 30, 32, 33, 34, 36, 38,
];

export interface TrimesterToDo {
  week: number;
  text: string;
  href: string;
}

/** The to-dos for one trimester, in week order. */
export function trimesterToDos(trimester: Trimester): TrimesterToDo[] {
  return TO_DO_WEEKS.filter((week) => getTrimester(week) === trimester).map((week) => ({
    week,
    text: getWeek(week).tip,
    href: `/semana/${week}`,
  }));
}
