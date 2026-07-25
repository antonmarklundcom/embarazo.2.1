import { describe, expect, it } from "vitest";
import {
  CONCEPTION_OFFSET_DAYS,
  DEFAULT_WEEK_DISPLAY,
  dueDateFrom,
  dueDateFromInput,
  formatGestationLength,
  formatWeekDisplay,
  isValidGestationDays,
  lmpFromInput,
} from "./dueDate";
import { GESTATION_DAYS, getCompletedGestation, getCurrentWeek } from "./pregnancy";

const DAY = 86_400_000;

/** 1 March 2026, 00:00 UTC — a fixed anchor so tests do not drift. */
const MARCH_1 = Date.UTC(2026, 2, 1);

function days(from: number, to: number): number {
  return Math.round((to - from) / DAY);
}

describe("lmpFromInput", () => {
  it("passes an LMP through unchanged", () => {
    expect(lmpFromInput({ method: "lmp", lmpDate: MARCH_1 })).toBe(MARCH_1);
  });

  it("back-calculates the LMP from a due date", () => {
    const due = MARCH_1 + 200 * DAY;
    const lmp = lmpFromInput({ method: "dueDate", dueDate: due });
    expect(days(lmp, due)).toBe(GESTATION_DAYS);
  });

  it("uses a custom gestation length for the due-date method", () => {
    const due = MARCH_1 + 200 * DAY;
    const lmp = lmpFromInput(
      { method: "dueDate", dueDate: due },
      { gestationDays: 287 },
    );
    expect(days(lmp, due)).toBe(287);
  });

  describe("ultrasound", () => {
    it("subtracts the reported gestational age from the scan date", () => {
      // "Tenés 12 semanas y 3 días" on 1 March → LMP was 87 days earlier.
      const lmp = lmpFromInput({
        method: "ultrasound",
        scanDate: MARCH_1,
        weeksAtScan: 12,
        daysAtScan: 3,
      });
      expect(days(lmp, MARCH_1)).toBe(12 * 7 + 3);
    });

    it("reproduces the reported age when asked for it back", () => {
      const scanDate = MARCH_1;
      const lmp = lmpFromInput({
        method: "ultrasound",
        scanDate,
        weeksAtScan: 20,
        daysAtScan: 5,
      });
      const g = getCompletedGestation(lmp, scanDate);
      expect(g).toEqual({ weeks: 20, days: 5 });
    });

    it("is unaffected by the gestation-length setting", () => {
      const input = {
        method: "ultrasound" as const,
        scanDate: MARCH_1,
        weeksAtScan: 10,
        daysAtScan: 0,
      };
      expect(lmpFromInput(input, { gestationDays: 280 })).toBe(
        lmpFromInput(input, { gestationDays: 294 }),
      );
    });
  });

  describe("ivf", () => {
    it("accounts for a day-5 embryo", () => {
      const lmp = lmpFromInput({
        method: "ivf",
        transferDate: MARCH_1,
        embryoDay: 5,
      });
      expect(days(lmp, MARCH_1)).toBe(5 + CONCEPTION_OFFSET_DAYS);
    });

    it("accounts for a day-3 embryo", () => {
      const lmp = lmpFromInput({
        method: "ivf",
        transferDate: MARCH_1,
        embryoDay: 3,
      });
      expect(days(lmp, MARCH_1)).toBe(3 + CONCEPTION_OFFSET_DAYS);
    });

    it("puts a day-3 transfer two days earlier in gestation than a day-5", () => {
      const d3 = lmpFromInput({
        method: "ivf",
        transferDate: MARCH_1,
        embryoDay: 3,
      });
      const d5 = lmpFromInput({
        method: "ivf",
        transferDate: MARCH_1,
        embryoDay: 5,
      });
      expect(days(d3, d5)).toBe(-2);
    });
  });

  it("offsets a known conception date by two weeks", () => {
    const lmp = lmpFromInput({
      method: "conception",
      conceptionDate: MARCH_1,
    });
    expect(days(lmp, MARCH_1)).toBe(CONCEPTION_OFFSET_DAYS);
  });
});

describe("dueDateFromInput", () => {
  it("round-trips a due date exactly", () => {
    const due = MARCH_1 + 150 * DAY;
    expect(dueDateFromInput({ method: "dueDate", dueDate: due })).toBe(due);
  });

  it("round-trips under a custom gestation length too", () => {
    const due = MARCH_1 + 150 * DAY;
    const settings = { gestationDays: 287 };
    expect(dueDateFromInput({ method: "dueDate", dueDate: due }, settings)).toBe(
      due,
    );
  });

  it("agrees with the LMP method for the same pregnancy", () => {
    const lmp = MARCH_1;
    expect(dueDateFromInput({ method: "lmp", lmpDate: lmp })).toBe(
      dueDateFrom(lmp),
    );
  });
});

describe("gestation length validation", () => {
  it("accepts the clinical range and the default", () => {
    expect(isValidGestationDays(GESTATION_DAYS)).toBe(true);
    expect(isValidGestationDays(259)).toBe(true);
    expect(isValidGestationDays(301)).toBe(true);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(isValidGestationDays(258)).toBe(false);
    expect(isValidGestationDays(302)).toBe(false);
    expect(isValidGestationDays(280.5)).toBe(false);
    expect(isValidGestationDays(Number.NaN)).toBe(false);
  });
});

describe("formatGestationLength", () => {
  it("formats as weeks+days", () => {
    expect(formatGestationLength(280)).toBe("40+0");
    expect(formatGestationLength(283)).toBe("40+3");
    expect(formatGestationLength(259)).toBe("37+0");
  });
});

describe("formatWeekDisplay", () => {
  it("defaults to the carné notation used in Paraguay", () => {
    expect(DEFAULT_WEEK_DISPLAY).toBe("weekDay");
    expect(formatWeekDisplay(24, 3)).toBe("24+3");
  });

  it("shows the friendly week number in the other mode", () => {
    // Completed week 24 means the user is *in* week 25 conversationally.
    expect(formatWeekDisplay(24, 3, "week")).toBe("25");
  });

  it("stays consistent with getCurrentWeek", () => {
    const lmp = MARCH_1;
    const now = MARCH_1 + (24 * 7 + 3) * DAY;
    const g = getCompletedGestation(lmp, now);
    expect(formatWeekDisplay(g.weeks, g.days, "week")).toBe(
      String(getCurrentWeek(lmp, now)),
    );
  });
});
