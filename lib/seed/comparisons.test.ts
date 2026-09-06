import { describe, expect, it } from "vitest";

import { COMPARISONS, comparisonFor } from "./comparisons";
import { WEEKS, getWeek } from "../weeks";
import { MIN_WEEK, MAX_WEEK } from "../pregnancy";

// U7. The comparison drawing is only as honest as this table, and the failure
// mode it guards against is a quiet one: a copy edit changes "una mandioca" to
// "un zapallo" in `lib/weeks.ts`, the label follows, and the hero keeps drawing
// a mandioca-sized silhouette because nothing connected the two files.

/** The first week with an embryo to compare against anything. */
const FIRST_COMPARED_WEEK = 3;

describe("every week that has a baby has something to compare it to", () => {
  it("covers weeks 3 through 42 with no gaps", () => {
    const weeks = COMPARISONS.map((row) => row.week).sort((a, b) => a - b);
    const expected = Array.from(
      { length: MAX_WEEK - FIRST_COMPARED_WEEK + 1 },
      (_, i) => FIRST_COMPARED_WEEK + i,
    );
    expect(weeks).toEqual(expected);
  });

  it("has no duplicate weeks", () => {
    expect(new Set(COMPARISONS.map((r) => r.week)).size).toBe(COMPARISONS.length);
  });

  it("says nothing for weeks 1 and 2, where there is no embryo", () => {
    // `lib/weeks.ts` says "todavía no hay embrión" for both. Inventing a
    // comparison there would draw a size for something that does not exist.
    for (let week = MIN_WEEK; week < FIRST_COMPARED_WEEK; week += 1) {
      expect(comparisonFor(week)).toBeNull();
    }
  });
});

describe("the two files describe the same object", () => {
  it("matches `sizeComparison` in lib/weeks.ts, week for week", () => {
    // This is the assertion the feature rests on. The words are owned by
    // `lib/weeks.ts` and never rendered from the seed; `item` exists only so
    // that a change to one file without the other fails here.
    for (const row of COMPARISONS) {
      expect(row.item, `semana ${row.week}`).toBe(getWeek(row.week).sizeComparison);
    }
  });

  it("gives every compared week a real measurement in lib/weeks.ts too", () => {
    // A comparison is a ratio. An item size with no baby size is half a
    // fraction, and `heroScale` would draw the item alone.
    for (const row of COMPARISONS) {
      expect(getWeek(row.week).lengthCm, `semana ${row.week}`).toBeGreaterThan(0);
    }
  });
});

describe("the measurements are plausible rather than merely present", () => {
  it("grows over the pregnancy, allowing the deliberate dips", () => {
    // Not monotonic on purpose — week 21 is "un pomelo" (14 cm) after week 20's
    // "un mamón mediano" (25 cm), because the app switches to comparing a
    // crown-heel length against rounder objects. What must hold is the trend.
    const early = COMPARISONS.filter((r) => r.week <= 12).map((r) => r.itemCm);
    const late = COMPARISONS.filter((r) => r.week >= 36).map((r) => r.itemCm);
    expect(Math.max(...early)).toBeLessThan(Math.min(...late));
  });

  it("keeps the smallest items small enough to be worth a floor", () => {
    // Week 4 is a poppy seed. If this ever became a centimetre, the scale
    // engine's clamp would stop firing and nothing would look wrong.
    expect(comparisonFor(4)?.itemCm).toBeLessThan(0.5);
  });

  it("stays inside a size a person could hold", () => {
    for (const row of COMPARISONS) {
      expect(row.itemCm, `semana ${row.week}`).toBeGreaterThan(0);
      expect(row.itemCm, `semana ${row.week}`).toBeLessThanOrEqual(60);
    }
  });
});

describe("the image paths are ready for renders that do not exist yet", () => {
  it("points every row at /assets/comparaciones/", () => {
    // The files are not in the repo (U10 and the founder produce them). The
    // figure falls back to no image, exactly as the week hero does.
    for (const row of COMPARISONS) {
      expect(row.imageSrc).toMatch(/^\/assets\/comparaciones\/[a-z0-9-]+\.webp$/);
    }
  });

  it("reuses one file per item rather than one per week", () => {
    // "una sandía" spans several weeks. Forty files where twenty-eight would
    // do is forty downloads on mobile data.
    const items = new Set(COMPARISONS.map((r) => r.item));
    const images = new Set(COMPARISONS.map((r) => r.imageSrc));
    expect(images.size).toBe(items.size);
  });

  it("covers every week the app can actually show", () => {
    expect(WEEKS.length).toBe(MAX_WEEK);
  });
});
