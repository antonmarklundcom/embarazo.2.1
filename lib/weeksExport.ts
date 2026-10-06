import { WEEKS } from "./weeks.ts";

// F11 (2026-10 review) — the week data the site (embarazo.com.py) imports.
//
// The site's importer used to parse this repo's TypeScript with a hand-written
// tokenizer. It broke the day `weeks.ts` used an identifier (`NO_EMBRYO_YET`),
// and when it worked it overwrote the site's clinically reviewed milestones
// with the app's shorter ones. This is the contract instead: plain JSON, a
// name and a version, written by `npm run export:weeks` to
// `contracts/weeks.v1.json` and committed. `weeksExport.test.ts` fails when
// the committed file and this function disagree.
//
// Which fields mean what to the site is the site's call (its importer takes
// the measurements and leaves the milestones alone). This side's promise is
// only that version 1 keeps this shape: a change to it is version 2.

export const WEEKS_CONTRACT = "mibebe.weeks";
export const WEEKS_CONTRACT_VERSION = 1;

export interface WeekExportRow {
  week: number;
  /** Already resolved: weeks 1–2 carry the text the app shows, not a constant. */
  sizeComparison: string;
  lengthCm: number | null;
  weightG: number | null;
  milestone: string;
}

export interface WeeksExport {
  contract: typeof WEEKS_CONTRACT;
  version: typeof WEEKS_CONTRACT_VERSION;
  /** The big week number is the week in progress: completed weeks + 1. */
  weekNumbering: "in-progress";
  weeks: WeekExportRow[];
}

export function weeksExport(): WeeksExport {
  return {
    contract: WEEKS_CONTRACT,
    version: WEEKS_CONTRACT_VERSION,
    weekNumbering: "in-progress",
    weeks: WEEKS.map((week) => ({
      week: week.week,
      sizeComparison: week.sizeComparison,
      lengthCm: week.lengthCm ?? null,
      weightG: week.weightG ?? null,
      milestone: week.milestone,
    })),
  };
}

/** The file exactly as the generator writes it. */
export function weeksExportJson(): string {
  return JSON.stringify(weeksExport(), null, 2) + "\n";
}
