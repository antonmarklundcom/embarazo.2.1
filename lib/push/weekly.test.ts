import { describe, it, expect } from "vitest";

import {
  WEEKLY_TIP_COUNT,
  WEEKLY_TIP_HOUR,
  weeklyTipTimes,
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
