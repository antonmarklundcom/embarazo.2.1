import { describe, expect, it } from "vitest";

import { PUBLISHED_LIMB_SIZES, formatCm, limbSize } from "./limbSizes";
import { LimbSizeSchema, validateContentArray } from "../content/schemas";

// BUILD-PLAN C3. The data is the risk here, not the tab component: a wrong
// decimal point produces a card that confidently tells a pregnant woman her
// baby has an 18 cm foot. These tests are the ones that catch that.

describe("the foot and hand figures", () => {
  it("starts at week 9 and runs to 42, once each", () => {
    const weeks = PUBLISHED_LIMB_SIZES.map((entry) => entry.week);
    expect(weeks).toEqual(Array.from({ length: 34 }, (_, i) => i + 9));
  });

  it("only ever grows", () => {
    // Monotonicity is the cheapest possible check on hand-entered biometry,
    // and it catches a transposed digit that a range check would let through.
    const feet = PUBLISHED_LIMB_SIZES.map((entry) => entry.footCm!);
    const hands = PUBLISHED_LIMB_SIZES.map((entry) => entry.handCm!);
    for (let i = 1; i < feet.length; i += 1) {
      expect(feet[i]!, `el pie encoge en la semana ${i + 9}`).toBeGreaterThanOrEqual(
        feet[i - 1]!,
      );
      expect(hands[i]!, `la mano encoge en la semana ${i + 9}`).toBeGreaterThanOrEqual(
        hands[i - 1]!,
      );
    }
  });

  it("keeps the hand smaller than the foot, as a fetus's is", () => {
    for (const entry of PUBLISHED_LIMB_SIZES) {
      expect(entry.handCm!, `semana ${entry.week}`).toBeLessThanOrEqual(entry.footCm!);
    }
  });

  it("lands near a newborn's measurements at term", () => {
    // ~8 cm foot at 40 weeks. If this ever fails, the whole column moved.
    const atTerm = limbSize(40)!;
    expect(atTerm.footCm).toBeGreaterThan(7);
    expect(atTerm.footCm).toBeLessThan(9);
  });

  it("gives every measurement something to compare it to", () => {
    for (const entry of PUBLISHED_LIMB_SIZES) {
      expect(entry.footComparison, `semana ${entry.week}`).toBeTruthy();
      expect(entry.handComparison, `semana ${entry.week}`).toBeTruthy();
    }
  });
});

describe("weeks with no foot to measure", () => {
  it("returns null before week 9", () => {
    // The card drops to a single "tamaño" tab rather than showing an empty
    // panel — there is genuinely no foot yet, and saying so by omission is
    // better than a dash.
    for (const week of [1, 5, 8]) {
      expect(limbSize(week)).toBeNull();
    }
    expect(limbSize(9)).not.toBeNull();
  });

  it("returns null outside the pregnancy entirely", () => {
    expect(limbSize(0)).toBeNull();
    expect(limbSize(43)).toBeNull();
  });
});

describe("formatCm", () => {
  it("writes the decimal separator the way es-PY reads it", () => {
    expect(formatCm(8.2)).toBe("8,2 cm");
    expect(formatCm(8)).toBe("8,0 cm");
    expect(formatCm(0.35)).toBe("0,3 cm");
  });
});

describe("the schema", () => {
  it("rejects a missing decimal point", () => {
    expect(LimbSizeSchema.safeParse({ week: 20, footCm: 18 }).success).toBe(false);
    expect(LimbSizeSchema.safeParse({ week: 20, footCm: 1.8 }).success).toBe(true);
  });

  it("rejects an entry with neither a foot nor a hand", () => {
    expect(
      LimbSizeSchema.safeParse({ week: 20, footComparison: "algo" }).success,
    ).toBe(false);
  });

  it("catches two entries for the same week", () => {
    const { errors } = validateContentArray(
      "lib/seed/limbSizes.json",
      [
        { week: 24, footCm: 4.5 },
        { week: 24, footCm: 4.6 },
      ],
      LimbSizeSchema,
      (entry) => String(entry.week),
    );
    expect(errors.join(" ")).toContain("duplicado");
  });
});
