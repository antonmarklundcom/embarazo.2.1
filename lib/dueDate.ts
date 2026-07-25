import { GESTATION_DAYS } from "./pregnancy";

// Due-date calculation methods (BUILD-PLAN B3 / FEATURE-MAP #4, #5, #6).
//
// Design note: the whole app is keyed on the LMP (`pregnancy.lmpDate`), and
// that stays true. Every method below reduces to an effective LMP, so adding
// methods changes onboarding and settings only — no week page, tool or
// calculation downstream needs to know which method produced the date.
//
// Why this matters for Paraguay specifically: a lot of women here only know
// what the ecografía said ("tenés 12 semanas y 3 días"), not the date of their
// last period. Making ultrasound dating a first-class input rather than a
// conversion the user has to do in her head is the point of this task.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type DueDateMethod =
  /** Date of the last menstrual period. */
  | "lmp"
  /** Due date given by a doctor or a previous app. */
  | "dueDate"
  /** Gestational age reported by an ultrasound on a given date. */
  | "ultrasound"
  /** Embryo transfer date + embryo age at transfer (IVF / FIV). */
  | "ivf"
  /** Known conception date. */
  | "conception";

export const DUE_DATE_METHODS: DueDateMethod[] = [
  "lmp",
  "dueDate",
  "ultrasound",
  "ivf",
  "conception",
];

/** es-PY labels for the method picker. */
export const DUE_DATE_METHOD_LABELS: Record<DueDateMethod, string> = {
  lmp: "Fecha de mi última regla",
  dueDate: "Fecha probable de parto",
  ultrasound: "Lo que dijo la ecografía",
  ivf: "Tratamiento de fertilidad (FIV)",
  conception: "Fecha de concepción",
};

export const DUE_DATE_METHOD_HINTS: Record<DueDateMethod, string> = {
  lmp: "El primer día de tu última menstruación.",
  dueDate: "Si tu médico/a ya te dio una fecha, usá esa.",
  ultrasound: "Cuántas semanas y días te dieron, y en qué fecha.",
  ivf: "La fecha de la transferencia y de cuántos días era el embrión.",
  conception: "Solo si sabés el día exacto.",
};

/**
 * Days from conception back to the notional LMP. Standard obstetric
 * convention: gestational age is counted from the LMP, roughly two weeks
 * before conception.
 */
export const CONCEPTION_OFFSET_DAYS = 14;

/** Embryo age at transfer, in days. Day-3 and day-5 are the usual protocols. */
export type EmbryoDay = 3 | 5;

export type DueDateInput =
  | { method: "lmp"; lmpDate: number }
  | { method: "dueDate"; dueDate: number }
  | {
      method: "ultrasound";
      /** Date the scan was performed. */
      scanDate: number;
      /** Gestational age reported at the scan. */
      weeksAtScan: number;
      daysAtScan: number;
    }
  | { method: "ivf"; transferDate: number; embryoDay: EmbryoDay }
  | { method: "conception"; conceptionDate: number };

export interface PregnancySettings {
  /** Total gestation length in days. 280 (40+0) unless a clinician says otherwise. */
  gestationDays: number;
}

export const DEFAULT_PREGNANCY_SETTINGS: PregnancySettings = {
  gestationDays: GESTATION_DAYS,
};

/**
 * Plausible range for a custom gestation length. Wide enough for the real
 * clinical variation people are told (38–42 weeks), narrow enough that a typo
 * cannot silently produce nonsense.
 */
export const MIN_GESTATION_DAYS = 259; // 37+0
export const MAX_GESTATION_DAYS = 301; // 43+0

function addDays(timestamp: number, days: number): number {
  return timestamp + days * MS_PER_DAY;
}

/**
 * Reduces any input method to the effective LMP the rest of the app uses.
 *
 * `gestationDays` only affects the `dueDate` method — the others derive the LMP
 * from a measured point in the pregnancy, which does not depend on how long the
 * pregnancy is expected to last.
 */
export function lmpFromInput(
  input: DueDateInput,
  settings: PregnancySettings = DEFAULT_PREGNANCY_SETTINGS,
): number {
  switch (input.method) {
    case "lmp":
      return input.lmpDate;

    case "dueDate":
      return addDays(input.dueDate, -settings.gestationDays);

    case "ultrasound": {
      // The scan says "you were N weeks + M days on this date", so the LMP is
      // that many days before the scan.
      const ageInDays = input.weeksAtScan * 7 + input.daysAtScan;
      return addDays(input.scanDate, -ageInDays);
    }

    case "ivf": {
      // Transfer date minus the embryo's age gives conception (fertilisation);
      // the notional LMP is two weeks before that.
      const conception = addDays(input.transferDate, -input.embryoDay);
      return addDays(conception, -CONCEPTION_OFFSET_DAYS);
    }

    case "conception":
      return addDays(input.conceptionDate, -CONCEPTION_OFFSET_DAYS);
  }
}

/** Due date for an LMP under the given settings. */
export function dueDateFrom(
  lmp: number,
  settings: PregnancySettings = DEFAULT_PREGNANCY_SETTINGS,
): number {
  return addDays(lmp, settings.gestationDays);
}

/** Convenience: input → due date in one step. */
export function dueDateFromInput(
  input: DueDateInput,
  settings: PregnancySettings = DEFAULT_PREGNANCY_SETTINGS,
): number {
  return dueDateFrom(lmpFromInput(input, settings), settings);
}

export function isValidGestationDays(days: number): boolean {
  return (
    Number.isInteger(days) &&
    days >= MIN_GESTATION_DAYS &&
    days <= MAX_GESTATION_DAYS
  );
}

/** "40+0" style label for a gestation length. */
export function formatGestationLength(days: number): string {
  return `${Math.floor(days / 7)}+${days % 7}`;
}

// ---------------------------------------------------------------------------
// Week display (FEATURE-MAP #5)
// ---------------------------------------------------------------------------

/**
 * How the current week is shown. `weekDay` ("24+3") is the DEFAULT because it
 * is what the carné perinatal and every clinician in Paraguay use — matching
 * the paper the user is holding beats matching other apps.
 */
export type WeekDisplay = "weekDay" | "week";

export const DEFAULT_WEEK_DISPLAY: WeekDisplay = "weekDay";

/**
 * Formats completed gestation for display.
 *
 * Note the deliberate difference from `getCurrentWeek()`: the friendly week
 * ("estás en la semana 25") is completed weeks + 1, while the clinical
 * notation ("24+3") uses completed weeks. Both are correct in their register;
 * mixing them is what confuses people, so each has its own function.
 */
export function formatWeekDisplay(
  completedWeeks: number,
  days: number,
  display: WeekDisplay = DEFAULT_WEEK_DISPLAY,
): string {
  return display === "weekDay"
    ? `${completedWeeks}+${days}`
    : `${completedWeeks + 1}`;
}
