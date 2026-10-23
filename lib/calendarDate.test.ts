import { afterEach, describe, expect, it, vi } from "vitest";
import { toDateInput } from "./appointments";
import { addCalendarDays, calendarDaysBetween } from "./calendarDate";
import {
  getCompletedGestation, getCurrentWeek, getDaysRemaining, getDaysSinceLMP,
  getDueDate, getDaysRemainingForDueDate, getProgressFraction, getRawWeek, lmpFromConception,
  lmpFromDueDate, lmpFromEcografia, lmpFromFiv,
} from "./pregnancy";

afterEach(() => vi.unstubAllEnvs());

describe.each(["America/New_York", "America/Asuncion", "UTC"])("pregnancy civil dates in %s", (zone) => {
  it("counts seven dates across spring/fall, including 23/25-hour days", () => {
    vi.stubEnv("TZ", zone);
    for (const [month, day] of [[2, 2], [9, 26]]) {
      const start = new Date(2026, month!, day!).getTime();
      const end = new Date(2026, month!, day! + 7).getTime();
      expect(getDaysSinceLMP(start, end)).toBe(7);
      expect(getCurrentWeek(start, end)).toBe(2);
      expect(getCompletedGestation(start, end)).toEqual({ weeks: 1, days: 0 });
      expect(addCalendarDays(start, 7)).toBe(end);
      expect(addCalendarDays(end, -7)).toBe(start);
    }
  });

  it("round-trips every date method and custom duration across DST/leap dates", () => {
    vi.stubEnv("TZ", zone);
    for (const [year, month, day] of [[2024, 1, 29], [2026, 2, 2], [2026, 9, 26]]) {
      const lmp = new Date(year!, month!, day!).getTime();
      for (const duration of [266, 280, 294]) {
        const due = getDueDate(lmp, duration);
        expect(calendarDaysBetween(lmp, due)).toBe(duration);
        expect(new Date(due).getHours()).toBe(0);
        expect(lmpFromDueDate(due, duration)).toBe(lmp);
        expect(lmpFromEcografia(due, duration)).toBe(lmp);
        expect(getDaysRemaining(lmp, lmp, duration)).toBe(duration);
        expect(getDaysRemaining(lmp, due, duration)).toBe(0);
        expect(getProgressFraction(lmp, due, duration)).toBe(1);
      }
      expect(lmpFromFiv(addCalendarDays(lmp, 19), 5)).toBe(lmp);
      expect(lmpFromFiv(addCalendarDays(lmp, 17), 3)).toBe(lmp);
      expect(lmpFromConception(addCalendarDays(lmp, 14))).toBe(lmp);
    }
  });

  it("uses midnight boundaries consistently for all weeks 1..42 and uncapped completed age", () => {
    vi.stubEnv("TZ", zone);
    const lmp = new Date(2026, 0, 1).getTime();
    for (let week = 1; week <= 42; week++) {
      const days = (week - 1) * 7;
      const now = addCalendarDays(lmp, days);
      expect(getCurrentWeek(lmp, now)).toBe(week);
      expect(getCurrentWeek(lmp, now + 23 * 60 * 60 * 1000)).toBe(week);
      expect(getDaysSinceLMP(lmp, now)).toBe(days);
      expect(getCompletedGestation(lmp, now)).toEqual({ weeks: week - 1, days: 0 });
      if (week > 1) expect(getCurrentWeek(lmp, now - 1)).toBe(week - 1);
    }
    expect(getCurrentWeek(lmp, addCalendarDays(lmp, 300))).toBe(42);
    expect(getRawWeek(lmp, addCalendarDays(lmp, 300))).toBe(43);
    expect(getCompletedGestation(lmp, addCalendarDays(lmp, 300))).toEqual({ weeks: 42, days: 6 });
  });
});

it("does not rewrite legacy timestamps or guess their original zone during travel/sync", () => {
  // Saved midnight in Paraguay; a New York device has always displayed the
  // preceding civil date for this number. Keep that projection explicit.
  const stored = { lmpDate: Date.parse("2026-03-02T00:00:00-03:00"), dueDate: Date.parse("2026-12-07T00:00:00-03:00") };
  const bytesBefore = JSON.stringify(stored);
  vi.stubEnv("TZ", "America/Asuncion");
  expect(toDateInput(stored.lmpDate)).toBe("2026-03-02");
  expect(getDaysSinceLMP(stored.lmpDate, new Date(2026, 2, 9).getTime())).toBe(7);
  vi.stubEnv("TZ", "America/New_York");
  expect(toDateInput(stored.lmpDate)).toBe("2026-03-01");
  const projectedDate = new Date(2026, 2, 1).getTime();
  const now = new Date(2026, 2, 9).getTime();
  expect(getDaysSinceLMP(stored.lmpDate, now)).toBe(8);
  expect(getCompletedGestation(stored.lmpDate, now)).toEqual(getCompletedGestation(projectedDate, now));
  expect(toDateInput(getDueDate(stored.lmpDate))).toBe("2026-12-06");
  expect(JSON.stringify(stored)).toBe(bytesBefore);
});

it("preserves a legacy FPP's displayed date until an explicit date/duration edit", () => {
  vi.stubEnv("TZ", "America/New_York");
  const lmp = new Date(2026, 2, 2).getTime();
  // A synthetic old row computed with 266 * 24 hours crosses EST -> EDT.
  const savedDue = lmp + 266 * 86_400_000;
  const oldRow = JSON.stringify({ lmpDate: lmp, dueDate: savedDue, gestationDays: 266 });
  const now = new Date(2026, 2, 9).getTime();
  expect(getDaysRemainingForDueDate(savedDue, now)).toBe(calendarDaysBetween(now, savedDue));
  expect(JSON.stringify(JSON.parse(oldRow))).toBe(oldRow);
  // A second case crosses EDT -> EST and has the historical 23:00 FPP.
  const fallLmp = new Date(2026, 5, 1).getTime();
  const fallSavedDue = fallLmp + 266 * 86_400_000;
  expect(toDateInput(fallSavedDue)).not.toBe(toDateInput(getDueDate(fallLmp, 266)));
  expect(getDaysRemainingForDueDate(fallSavedDue, fallLmp)).toBe(265);
  expect(getDaysRemaining(fallLmp, fallLmp, 266)).toBe(266);
});
