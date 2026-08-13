import { describe, expect, it } from "vitest";

import { formatSleep, nightKey, summarise } from "./sleep";

describe("summarise", () => {
  const night = (minutes: number, quality: number, reasons: string[] = []) => ({
    date: 0,
    minutes,
    quality,
    reasons,
  });

  it("says nothing about no nights", () => {
    expect(summarise([])).toEqual({
      nights: 0,
      averageMinutes: 0,
      averageQuality: 0,
      topReason: null,
    });
  });

  it("averages over the nights that exist, not over seven", () => {
    // A woman who logged four nights slept the other three; counting those as
    // "0 h" would produce a number worth worrying about for no reason.
    const summary = summarise([night(420, 4), night(360, 3)]);
    expect(summary.nights).toBe(2);
    expect(summary.averageMinutes).toBe(390);
    expect(summary.averageQuality).toBe(3.5);
  });

  it("finds what came up most often", () => {
    const summary = summarise([
      night(400, 3, ["Acidez", "Calor"]),
      night(380, 2, ["Acidez"]),
      night(420, 4, ["Calor"]),
      night(300, 2, ["Acidez"]),
    ]);
    expect(summary.topReason).toBe("Acidez");
  });

  it("reports no reason when nobody logged one", () => {
    expect(summarise([night(400, 4)]).topReason).toBeNull();
  });

  it("keeps the quality average to one decimal", () => {
    expect(summarise([night(400, 1), night(400, 2), night(400, 2)]).averageQuality).toBe(
      1.7,
    );
  });
});

describe("formatSleep", () => {
  it("reads the way somebody says it out loud", () => {
    expect(formatSleep(450)).toBe("7 h 30 min");
    expect(formatSleep(480)).toBe("8 h");
    expect(formatSleep(45)).toBe("45 min");
  });
});

describe("nightKey", () => {
  it("collapses a night to the day you woke up", () => {
    // One row per night: logging twice corrects the night rather than adding
    // a second one.
    const morning = nightKey(new Date(2026, 7, 13, 6, 30));
    const evening = nightKey(new Date(2026, 7, 13, 23, 45));
    expect(morning).toBe(evening);
    expect(nightKey(new Date(2026, 7, 14, 6, 30))).not.toBe(morning);
  });
});
