import { describe, expect, it } from "vitest";

import { DAILY_TIPS, getDailyTip } from "./dailyTips";

// Growth plan item 10: the pool grew from 31 to 100+, so the rules it has to
// keep are now worth a test rather than a reviewer's eye.

describe("daily tips", () => {
  it("has at least 100, with unique ids and no repeated text", () => {
    expect(DAILY_TIPS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(DAILY_TIPS.map((t) => t.id)).size).toBe(DAILY_TIPS.length);
    const normalised = DAILY_TIPS.map((t) => t.text.toLowerCase().replace(/\s+/g, " ").trim());
    expect(new Set(normalised).size).toBe(DAILY_TIPS.length);
  });

  it("covers every trimester, so each day's pool has variety", () => {
    for (const trimester of [0, 1, 2, 3] as const) {
      expect(DAILY_TIPS.filter((t) => t.trimester === trimester).length, `trimester ${trimester}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("never gives a dose", () => {
    // Class (B) content: no amounts of a medicine or supplement.
    for (const tip of DAILY_TIPS) {
      expect(tip.text, tip.id).not.toMatch(/\d+\s*(mg|mcg|µg|ml|UI|gotas|comprimidos|pastillas)\b/i);
    }
  });

  it("fits on a phone card", () => {
    for (const tip of DAILY_TIPS) {
      expect(tip.text.length, tip.id).toBeLessThanOrEqual(160);
    }
  });

  it("is stable within a day and draws from the right trimester", () => {
    const day = new Date(2026, 8, 27, 9);
    const later = new Date(2026, 8, 27, 21);
    expect(getDailyTip(20, 2, day)).toEqual(getDailyTip(20, 2, later));
    for (let week = 1; week <= 42; week++) {
      const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
      const tip = getDailyTip(week, trimester, day);
      expect([0, trimester]).toContain(tip.trimester);
    }
  });
});
