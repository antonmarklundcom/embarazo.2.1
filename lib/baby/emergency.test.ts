import { describe, expect, it } from "vitest";
import { postpartumCallContext } from "./emergency";

describe("postpartum emergency call context", () => {
  const now = new Date(2026, 9, 11, 12).getTime();
  it("describes today's birth and the newborn without a gestational age", () => {
    expect(postpartumCallContext(now, now)).toEqual({
      mother: "Di a luz hoy.",
      baby: "Mi bebé tiene 0 días.",
    });
  });

  it("uses the baby's actual age after birth rather than a continuing pregnancy week", () => {
    const birth = new Date(2026, 9, 1).getTime();
    const context = postpartumCallContext(birth, now);
    expect(context).toEqual({ mother: "Di a luz hace 10 días.", baby: "Mi bebé tiene 10 días." });
    expect(context.mother).not.toContain("embarazada");
  });
});
