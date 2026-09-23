import { describe, expect, it } from "vitest";

import { MOODS, moodNeedsSupport } from "./mood";

// The home check-in's support line: exactly "Mal" and "Muy mal", never the
// ordinary days — a "no estás sola" under "Regular" would read as the app
// deciding she is not fine.

describe("moodNeedsSupport", () => {
  it("is true for exactly the two low moods", () => {
    const flagged = MOODS.filter((m) => moodNeedsSupport(m.key)).map((m) => m.label);
    expect(flagged).toEqual(["Mal", "Muy mal"]);
  });

  it("is false with no mood recorded", () => {
    expect(moodNeedsSupport(undefined)).toBe(false);
  });
});
