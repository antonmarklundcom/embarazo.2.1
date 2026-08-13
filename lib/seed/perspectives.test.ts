import { describe, expect, it } from "vitest";

import { PUBLISHED_PERSPECTIVES, perspectivesFor, selectBand } from "./perspectives";
import { PerspectiveBandSchema, validateContentArray } from "../content/schemas";

// BUILD-PLAN C4. Two things are worth testing here: that every week of the
// pregnancy is covered (a gap means a user opens the app one week and the block
// is gone), and that the narrowest-band rule works — that rule is the whole
// content-deepening story, and it is invisible until someone adds an override.

describe("coverage", () => {
  it("answers every week from 1 to 42", () => {
    for (let week = 1; week <= 42; week += 1) {
      expect(perspectivesFor(week), `semana ${week} sin contenido`).not.toBeNull();
    }
  });

  it("says nothing outside the pregnancy", () => {
    expect(perspectivesFor(0)).toBeNull();
    expect(perspectivesFor(43)).toBeNull();
  });

  it("leaves no gap and no overlap between the shipped bands", () => {
    const ordered = [...PUBLISHED_PERSPECTIVES].sort((a, b) => a.fromWeek - b.fromWeek);
    expect(ordered[0]!.fromWeek).toBe(1);
    expect(ordered.at(-1)!.toWeek).toBe(42);
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]!.fromWeek).toBe(ordered[i - 1]!.toWeek + 1);
    }
  });

  it("gives all three perspectives something to say, every time", () => {
    for (const band of PUBLISHED_PERSPECTIVES) {
      for (const key of ["vos", "pareja", "familia"] as const) {
        expect(band[key].length, `${band.fromWeek}-${band.toWeek} · ${key}`).toBeGreaterThan(
          40,
        );
      }
      // Three tabs that say the same thing are worse than one tab.
      expect(new Set([band.vos, band.pareja, band.familia]).size).toBe(3);
    }
  });
});

describe("the narrowest band wins", () => {
  // This is the deepening path: a later content pass overrides one week by
  // adding a one-week entry, and nothing else changes.
  const wide = { fromWeek: 1, toWeek: 42, vos: "ancha", pareja: "ancha", familia: "ancha" };
  const narrow = { fromWeek: 24, toWeek: 24, vos: "justa", pareja: "justa", familia: "justa" };

  it("prefers a one-week override over the band containing it", () => {
    // Both orders, so the result cannot depend on where the override happened
    // to be pasted into the file.
    expect(selectBand([wide, narrow], 24)?.vos).toBe("justa");
    expect(selectBand([narrow, wide], 24)?.vos).toBe("justa");
    expect(selectBand([wide, narrow], 25)?.vos).toBe("ancha");
  });

  it("falls back to nothing when no band covers the week", () => {
    expect(selectBand([narrow], 25)).toBeNull();
    expect(selectBand([], 24)).toBeNull();
  });
});

describe("the schema", () => {
  it("rejects a range that runs backwards", () => {
    const backwards = {
      fromWeek: 20,
      toWeek: 10,
      vos: "a",
      pareja: "b",
      familia: "c",
    };
    expect(PerspectiveBandSchema.safeParse(backwards).success).toBe(false);
  });

  it("rejects a band missing one of the three perspectives", () => {
    expect(
      PerspectiveBandSchema.safeParse({ fromWeek: 1, toWeek: 6, vos: "a", pareja: "b" })
        .success,
    ).toBe(false);
  });

  it("catches the same range written twice", () => {
    const { errors } = validateContentArray(
      "lib/seed/perspectives.json",
      [
        { fromWeek: 1, toWeek: 6, vos: "a", pareja: "b", familia: "c" },
        { fromWeek: 1, toWeek: 6, vos: "d", pareja: "e", familia: "f" },
      ],
      PerspectiveBandSchema,
      (band) => `${band.fromWeek}-${band.toWeek}`,
    );
    expect(errors.join(" ")).toContain("duplicado");
  });
});
