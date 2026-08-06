import { describe, expect, it } from "vitest";
import { FOOD, PUBLISHED_FOOD } from "./food";

// D3 — the food lookup must never render an unreviewed entry. food.json
// ships today with `reviewedBy` unset on every entry (no medical sign-off
// yet), so PUBLISHED_FOOD must be empty until a reviewer is set, exactly
// like the other PUBLISHED_* gates in lib/seed/gate.test.ts.
describe("food lookup review gate (D3)", () => {
  it("has content authored, all currently unreviewed", () => {
    expect(FOOD.length).toBeGreaterThan(40);
    expect(FOOD.every((entry) => !entry.reviewedBy)).toBe(true);
  });

  it("publishes nothing until reviewedBy is set", () => {
    expect(PUBLISHED_FOOD).toHaveLength(0);
  });

  it("every entry has an actionable reason, not just a disclaimer", () => {
    for (const entry of FOOD) {
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });
});
