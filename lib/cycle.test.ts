import { describe, it, expect } from "vitest";
import {
  predictNextStart,
  estimateFertileWindow,
  averageCycleLength,
  cycleDay,
  daysUntil,
  DEFAULT_CYCLE_LENGTH,
  LUTEAL_PHASE_DAYS,
} from "./cycle";

const DAY = 86400000;

describe("predictNextStart", () => {
  it("adds the average cycle length to the last start", () => {
    expect(predictNextStart(0, 28)).toBe(28 * DAY);
    expect(predictNextStart(0)).toBe(DEFAULT_CYCLE_LENGTH * DAY);
  });
});

describe("estimateFertileWindow", () => {
  it("centres on ovulation (cycle length − luteal phase)", () => {
    const w = estimateFertileWindow(0, 28);
    const ovDay = 28 - LUTEAL_PHASE_DAYS; // 14
    expect(w.ovulation).toBe(ovDay * DAY);
    expect(w.start).toBe((ovDay - 5) * DAY);
    expect(w.end).toBe((ovDay + 1) * DAY);
  });
  it("shifts later for longer cycles", () => {
    const w = estimateFertileWindow(0, 32);
    expect(w.ovulation).toBe((32 - LUTEAL_PHASE_DAYS) * DAY);
  });
});

describe("averageCycleLength", () => {
  it("is undefined with fewer than two periods", () => {
    expect(averageCycleLength([])).toBeUndefined();
    expect(averageCycleLength([0])).toBeUndefined();
  });
  it("averages the gaps between consecutive starts", () => {
    // starts at day 0, 28, 58 -> gaps 28 and 30 -> avg 29
    expect(averageCycleLength([0, 28 * DAY, 58 * DAY])).toBe(29);
  });
  it("sorts unordered input first", () => {
    expect(averageCycleLength([28 * DAY, 0])).toBe(28);
  });
});

describe("cycleDay", () => {
  it("is day 1 on the start date and counts up", () => {
    expect(cycleDay(0, 0)).toBe(1);
    expect(cycleDay(0, 5 * DAY)).toBe(6);
  });
  it("never returns less than 1", () => {
    expect(cycleDay(0, -3 * DAY)).toBe(1);
  });
});

describe("daysUntil", () => {
  it("is positive for the future and negative for the past", () => {
    expect(daysUntil(10 * DAY, 0)).toBe(10);
    expect(daysUntil(0, 10 * DAY)).toBe(-10);
  });
});
