import { describe, it, expect } from "vitest";
import {
  getCurrentWeek,
  getTrimester,
  getDueDate,
  getDaysRemaining,
  clampWeek,
  lmpFromDueDate,
  getRawWeek,
  getDaysSinceLMP,
  getCompletedGestation,
  formatCompletedGestation,
  GESTATION_DAYS,
} from "./pregnancy";

const DAY = 86400000;

describe("clampWeek", () => {
  it("clamps below and above the valid range", () => {
    expect(clampWeek(0)).toBe(1);
    expect(clampWeek(-5)).toBe(1);
    expect(clampWeek(43)).toBe(42);
    expect(clampWeek(100)).toBe(42);
  });
  it("keeps valid weeks and floors fractions", () => {
    expect(clampWeek(1)).toBe(1);
    expect(clampWeek(20)).toBe(20);
    expect(clampWeek(20.9)).toBe(20);
  });
  it("falls back to MIN_WEEK on NaN", () => {
    expect(clampWeek(Number.NaN)).toBe(1);
  });
});

describe("getCurrentWeek", () => {
  it("is week 1 at the LMP date", () => {
    const lmp = Date.now();
    expect(getCurrentWeek(lmp, lmp)).toBe(1);
  });
  it("advances one week per 7 days", () => {
    const lmp = 0;
    expect(getCurrentWeek(lmp, 7 * DAY)).toBe(2);
    expect(getCurrentWeek(lmp, 13 * 7 * DAY)).toBe(14);
  });
  it("clamps very advanced dates to 42", () => {
    const lmp = 0;
    expect(getCurrentWeek(lmp, 60 * 7 * DAY)).toBe(42);
  });
});

describe("getTrimester", () => {
  it("maps weeks to trimesters per spec (T1 1-13, T2 14-27, T3 28+)", () => {
    expect(getTrimester(1)).toBe(1);
    expect(getTrimester(13)).toBe(1);
    expect(getTrimester(14)).toBe(2);
    expect(getTrimester(27)).toBe(2);
    expect(getTrimester(28)).toBe(3);
    expect(getTrimester(42)).toBe(3);
  });
});

describe("getDueDate", () => {
  it("is LMP + 280 days", () => {
    const lmp = 1_000_000_000_000;
    expect(getDueDate(lmp)).toBe(lmp + GESTATION_DAYS * DAY);
  });
});

describe("lmpFromDueDate", () => {
  it("is the inverse of getDueDate", () => {
    const lmp = 1_000_000_000_000;
    expect(lmpFromDueDate(getDueDate(lmp))).toBe(lmp);
  });
  it("subtracts 280 days from the due date", () => {
    const due = 2_000_000_000_000;
    expect(lmpFromDueDate(due)).toBe(due - GESTATION_DAYS * DAY);
  });
});

describe("getRawWeek", () => {
  it("does not clamp beyond 42 weeks (for term warnings)", () => {
    const lmp = 0;
    expect(getRawWeek(lmp, 0)).toBe(1);
    expect(getRawWeek(lmp, 50 * 7 * DAY)).toBe(51);
  });
});

describe("getDaysRemaining", () => {
  it("returns full gestation at the LMP date", () => {
    const lmp = 0;
    expect(getDaysRemaining(lmp, 0)).toBe(GESTATION_DAYS);
  });
  it("never goes negative past the due date", () => {
    const lmp = 0;
    expect(getDaysRemaining(lmp, 400 * DAY)).toBe(0);
  });
});

describe("getDaysSinceLMP", () => {
  it("is 0 at the LMP date and clamps negatives", () => {
    const lmp = 0;
    expect(getDaysSinceLMP(lmp, 0)).toBe(0);
    expect(getDaysSinceLMP(lmp, -5 * DAY)).toBe(0);
  });
  it("counts whole elapsed days", () => {
    const lmp = 0;
    expect(getDaysSinceLMP(lmp, 16 * DAY)).toBe(16);
  });
});

describe("getCompletedGestation", () => {
  it("splits elapsed days into completed weeks + days (carné convention)", () => {
    const lmp = 0;
    // 121 days = 17 weeks and 2 days; friendly week would be 18.
    expect(getCompletedGestation(lmp, 121 * DAY)).toEqual({ weeks: 17, days: 2 });
    expect(getCurrentWeek(lmp, 121 * DAY)).toBe(18);
  });
  it("is 0 weeks 0 days at the LMP date", () => {
    expect(getCompletedGestation(0, 0)).toEqual({ weeks: 0, days: 0 });
  });
});

describe("formatCompletedGestation", () => {
  it("uses es-PY singular/plural correctly", () => {
    expect(formatCompletedGestation({ weeks: 17, days: 2 })).toBe(
      "17 semanas y 2 días",
    );
    expect(formatCompletedGestation({ weeks: 1, days: 1 })).toBe(
      "1 semana y 1 día",
    );
    expect(formatCompletedGestation({ weeks: 0, days: 0 })).toBe(
      "0 semanas y 0 días",
    );
  });
});
