import { describe, it, expect } from "vitest";

import {
  WEEKLY_TIP_COUNT,
  WEEKLY_TIP_HOUR,
  weeklyTipTimes,
  weekStartTimes,
} from "./weekly";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("weeklyTipTimes", () => {
  const morning = new Date(2026, 7, 20, 8, 0).getTime(); // before the slot
  const evening = new Date(2026, 7, 20, 20, 0).getTime(); // after it

  it("lands on the local slot hour, every time", () => {
    for (const now of [morning, evening]) {
      for (const at of weeklyTipTimes(now)) {
        const date = new Date(at);
        expect(date.getHours()).toBe(WEEKLY_TIP_HOUR);
        expect(date.getMinutes()).toBe(0);
      }
    }
  });

  it("takes today's slot when it has not passed yet", () => {
    expect(new Date(weeklyTipTimes(morning)[0]!).getDate()).toBe(20);
  });

  it("waits a week when today's has", () => {
    // The dispatcher fires everything whose fireAt has gone by, so a stale
    // entry is not a skipped tip — it is an immediate one, at 20:00.
    expect(new Date(weeklyTipTimes(evening)[0]!).getDate()).toBe(27);
  });

  it("never returns a time in the past", () => {
    for (const now of [morning, evening]) {
      for (const at of weeklyTipTimes(now)) expect(at).toBeGreaterThan(now);
    }
  });

  it("keeps the same weekday across every slot", () => {
    const weekdays = new Set(
      weeklyTipTimes(morning).map((at) => new Date(at).getDay()),
    );
    expect(weekdays.size).toBe(1);
  });

  it("stays on the hour across a daylight-saving change", () => {
    // Paraguay observes DST. Adding a fixed 604 800 000 ms per week walks the
    // tip an hour off at the boundary and leaves it there.
    const beforeChange = new Date(2026, 8, 15, 8, 0).getTime();
    for (const at of weeklyTipTimes(beforeChange, 20)) {
      expect(new Date(at).getHours()).toBe(WEEKLY_TIP_HOUR);
    }
  });

  it("returns exactly what it was asked for, in order", () => {
    expect(weeklyTipTimes(morning)).toHaveLength(WEEKLY_TIP_COUNT);
    expect(weeklyTipTimes(morning, 3)).toHaveLength(3);
    const times = weeklyTipTimes(morning);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("spaces the slots a week apart", () => {
    const times = weeklyTipTimes(morning, 4);
    for (let i = 1; i < times.length; i += 1) {
      const gap = times[i]! - times[i - 1]!;
      // A week, give or take the DST hour.
      expect(gap).toBeGreaterThanOrEqual(6 * MS_PER_DAY + 23 * 3_600_000);
      expect(gap).toBeLessThanOrEqual(7 * MS_PER_DAY + 3_600_000);
    }
  });
});

describe("weekStartTimes — her week turns on her own weekday", () => {
  // FUM on Wednesday 1 July 2026, local midnight (how onboarding stores it).
  const lmp = new Date(2026, 6, 1).getTime();

  it("fires on the FUM's weekday, never on the day the app was opened", () => {
    // Opened on a Friday and on a Monday: both schedules are Wednesdays.
    for (const opened of [new Date(2026, 7, 21, 9).getTime(), new Date(2026, 7, 24, 18).getTime()]) {
      const times = weekStartTimes(lmp, opened);
      expect(times.length).toBe(WEEKLY_TIP_COUNT);
      for (const at of times) {
        const date = new Date(at);
        expect(date.getDay()).toBe(3); // Wednesday
        expect(date.getHours()).toBe(WEEKLY_TIP_HOUR);
      }
    }
  });

  it("is the same list whatever day in between it is computed on", () => {
    const fromFriday = weekStartTimes(lmp, new Date(2026, 7, 21, 9).getTime());
    const fromMonday = weekStartTimes(lmp, new Date(2026, 7, 24, 9).getTime());
    expect(fromMonday[0]).toBe(fromFriday[0]);
  });

  it("takes today at 10:00 when today is her turnover day and it is still early", () => {
    const wednesdayMorning = new Date(2026, 7, 26, 8).getTime();
    expect(weekStartTimes(lmp, wednesdayMorning)[0]).toBe(new Date(2026, 7, 26, 10).getTime());
  });

  it("waits a week when today's 10:00 has passed", () => {
    const wednesdayEvening = new Date(2026, 7, 26, 20).getTime();
    expect(weekStartTimes(lmp, wednesdayEvening)[0]).toBe(new Date(2026, 8, 2, 10).getTime());
  });

  it("never returns a time in the past, and steps exactly one calendar week", () => {
    const now = new Date(2026, 7, 21, 9).getTime();
    const times = weekStartTimes(lmp, now);
    expect(times[0]!).toBeGreaterThan(now);
    for (let i = 1; i < times.length; i += 1) {
      const gap = Math.round((times[i]! - times[i - 1]!) / MS_PER_DAY);
      expect(gap).toBe(7);
    }
  });

  it("stops after week 42", () => {
    // 41 weeks + 3 days in: only week 42's turnover is left.
    const late = lmp + (41 * 7 + 3) * MS_PER_DAY;
    expect(weekStartTimes(lmp, late)).toHaveLength(1);
  });
});
