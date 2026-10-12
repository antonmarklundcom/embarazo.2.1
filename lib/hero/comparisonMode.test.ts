import { describe, it, expect } from "vitest";
import { comparisonMode, comparisonVisible } from "./comparisonMode";
describe("comparison preference", () => {
  it("defaults missing/malformed preferences to fruits, and retains an explicit measures choice", () => {
    for (const value of [undefined,null,"false",0,true]) expect(comparisonMode(value)).toBe("fruits");
    expect(comparisonMode(false)).toBe("measures");
    expect(comparisonVisible(comparisonMode(false))).toBe(false);
    expect(comparisonVisible(comparisonMode(true))).toBe(true);
  });
});
