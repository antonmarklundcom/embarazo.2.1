import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { COMPARISONS, comparisonFor, comparisonCaption, ILLUSTRATION_CAPTION } from "./comparisons";
import { WEEKS, getWeek } from "../weeks";
import { weeksExport } from "../weeksExport";

describe("honest fruit references", () => {
  it("covers weeks 4–42 once; early/missing/invalid weeks have no fruit", () => {
    expect(COMPARISONS.map(row => row.week)).toEqual(Array.from({length:39},(_,i)=>i+4));
    for (const week of [1,2,3,0,43,NaN,Infinity,4.5]) expect(comparisonFor(week)).toBeNull();
    expect(getWeek(3).sizeComparison).toBe("todavía microscópico");
  });
  it("keeps labels and accessible captions aligned; uses weight after the ruler switch", () => {
    for (const row of COMPARISONS) {
      expect(row.item).toBe(getWeek(row.week).sizeComparison);
      expect(row.basis).toBe(row.week < 20 ? "length" : "weight");
      expect(comparisonCaption(row.week)).toContain(row.item);
      expect(row).not.toHaveProperty("itemCm");
    }
    expect(comparisonCaption(3)).toBeNull();
    expect(ILLUSTRATION_CAPTION).toContain("sin escala");
  });
  it("uses familiar single fruits, keeps repeats, and has actual image files", () => {
    for (const row of COMPARISONS) {
      expect(row.item).not.toMatch(/racimo|bananas|mandioca|choclo|lechuga|berenjena|andaí|zapallo/);
      expect(existsSync(new URL("../../public"+row.imageSrc, import.meta.url))).toBe(true);
    }
    expect(getWeek(15).sizeComparison).toBe("una manzana");
    expect(getWeek(17).sizeComparison).toBe("una pera");
    expect(getWeek(40).sizeComparison).toBe(getWeek(41).sizeComparison);
  });
  it("retains the existing 42 weeks' clinical measurements and milestones exactly", () => {
    expect(WEEKS).toHaveLength(42);
    const rows=weeksExport().weeks.map(({week,lengthCm,weightG,milestone})=>({week,lengthCm,weightG,milestone}));
    expect(createHash("sha256").update(JSON.stringify(rows)).digest("hex")).toBe("6f6b43d2ed1407d2bafe87d161d11d5a12436d471ebaf5c4e1940e873778d4b6");
    expect(JSON.parse(readFileSync(new URL("../../contracts/weeks.v1.json",import.meta.url),"utf8")).weeks).toHaveLength(42);
  });
});
