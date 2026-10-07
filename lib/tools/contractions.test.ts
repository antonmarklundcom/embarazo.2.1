import { describe, expect, it } from "vitest";

import { getCompletedGestation } from "@/lib/pregnancy";

import { assess511, MIN_WEEK_FOR_HINT, type ContractionSample } from "./contractions";

// BUILD-PLAN D7. `assess511` only ever runs on-device data; these tests are
// what makes "silence, not reassurance" true for the edge cases rather than
// aspirational.

const NOW = Date.parse("2026-09-06T03:00:00Z");

/** `count` contractions, `gapSec` apart, each lasting `durationSec`, ending at `now`. */
function series(
  count: number,
  gapSec: number,
  durationSec: number,
  now = NOW,
): ContractionSample[] {
  return Array.from({ length: count }, (_, i) => ({
    startedAt: now - (count - 1 - i) * gapSec * 1000,
    durationSec,
  }));
}

describe("assess511", () => {
  it("detects a textbook 5-1-1 hour", () => {
    const entries = series(7, 5 * 60, 60);
    expect(assess511(entries, NOW)).toEqual({ pattern: "5-1-1" });
  });

  it("says nothing with fewer than 6 contractions", () => {
    const entries = series(5, 5 * 60, 60);
    expect(assess511(entries, NOW)).toBeNull();
  });

  it("says nothing when the gap is too wide", () => {
    const entries = series(7, 12 * 60, 60);
    expect(assess511(entries, NOW)).toBeNull();
  });

  it("says nothing when contractions are too short", () => {
    const entries = series(7, 5 * 60, 20);
    expect(assess511(entries, NOW)).toBeNull();
  });

  it("tolerates one long outlier without breaking the median", () => {
    const entries = series(7, 5 * 60, 60);
    entries[3]!.durationSec = 240;
    expect(assess511(entries, NOW)).toEqual({ pattern: "5-1-1" });
  });

  it("counts a contraction still in progress toward the pattern", () => {
    // Six finished, five minutes apart, then a seventh just started —
    // duration unknown, must not crash and must not count toward the median.
    const entries = series(6, 5 * 60, 60);
    const inProgressStartedAt = NOW + 60 * 1000;
    expect(
      assess511(entries, inProgressStartedAt, { inProgressStartedAt }),
    ).toEqual({ pattern: "5-1-1" });
  });

  it("ignores entries outside the last 60 minutes", () => {
    const recent = series(6, 5 * 60, 60);
    const stale: ContractionSample = { startedAt: NOW - 5 * 60 * 60 * 1000, durationSec: 60 };
    expect(assess511([stale, ...recent], NOW)).toEqual({ pattern: "5-1-1" });
    // Six real ones is already at the threshold; drop one and it must fail.
    expect(assess511([stale, ...recent.slice(1)], NOW)).toBeNull();
  });

  it("reports a regular pattern before term as preterm, not as silence", () => {
    // This test used to pin the opposite — `null` below 37 weeks — and that
    // was the bug: regular contractions before term are an alarm sign, and
    // the screen showed her nothing at all.
    const entries = series(7, 5 * 60, 60);
    expect(
      assess511(entries, NOW, { completedWeeks: MIN_WEEK_FOR_HINT - 1 }),
    ).toEqual({ pattern: "preterm" });
    expect(assess511(entries, NOW, { completedWeeks: 30 })).toEqual({ pattern: "preterm" });
    expect(
      assess511(entries, NOW, { completedWeeks: MIN_WEEK_FOR_HINT }),
    ).toEqual({ pattern: "5-1-1" });
    // An unknown week is treated as term, never as a reason for silence.
    expect(assess511(entries, NOW, {})).toEqual({ pattern: "5-1-1" });
  });

  it("F05: decides term by completed weeks, so 36+6 is still preterm", () => {
    const entries = series(7, 5 * 60, 60);
    const DAY = 24 * 60 * 60 * 1000;
    const at = (weeks: number, days: number) =>
      getCompletedGestation(NOW - (weeks * 7 + days) * DAY, NOW).weeks;
    // 36+0 and 36+6 are display week 37 — the value this used to be given.
    expect(assess511(entries, NOW, { completedWeeks: at(36, 0) })).toEqual({ pattern: "preterm" });
    expect(assess511(entries, NOW, { completedWeeks: at(36, 6) })).toEqual({ pattern: "preterm" });
    expect(assess511(entries, NOW, { completedWeeks: at(37, 0) })).toEqual({ pattern: "5-1-1" });
    expect(assess511(entries, NOW, { completedWeeks: at(35, 6) })).toEqual({ pattern: "preterm" });
  });

  it("stays silent before term when the pattern is not regular", () => {
    // Same detection as at term — the week changes the verdict, not the bar.
    expect(assess511(series(5, 5 * 60, 60), NOW, { completedWeeks: 32 })).toBeNull();
    expect(assess511(series(7, 12 * 60, 60), NOW, { completedWeeks: 32 })).toBeNull();
    expect(assess511(series(7, 5 * 60, 20), NOW, { completedWeeks: 32 })).toBeNull();
  });

  it("says nothing with no entries at all", () => {
    expect(assess511([], NOW)).toBeNull();
  });
});
