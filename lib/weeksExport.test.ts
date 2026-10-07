import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NO_EMBRYO_YET } from "./weeks";
import { WEEKS_CONTRACT, WEEKS_CONTRACT_VERSION, weeksExport, weeksExportJson } from "./weeksExport";

// F11 — the committed export is what the site imports. Stale means the site
// imports yesterday's numbers; this is where that is caught.

describe("contracts/weeks.v1.json", () => {
  it("is exactly what `npm run export:weeks` would write today", () => {
    const onDisk = readFileSync(join(process.cwd(), "contracts", "weeks.v1.json"), "utf8");
    expect(onDisk).toBe(weeksExportJson());
  });

  it("names its contract and version, and covers weeks 1–42 in order", () => {
    const data = weeksExport();
    expect(data.contract).toBe(WEEKS_CONTRACT);
    expect(data.version).toBe(WEEKS_CONTRACT_VERSION);
    expect(data.weeks.map((w) => w.week)).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it("carries plain values the site can read without running TypeScript", () => {
    const data = weeksExport();
    expect(data.weeks[0]!.sizeComparison).toBe(NO_EMBRYO_YET);
    for (const row of data.weeks) {
      expect(typeof row.sizeComparison).toBe("string");
      expect(row.lengthCm === null || row.lengthCm > 0).toBe(true);
      expect(row.weightG === null || row.weightG > 0).toBe(true);
    }
  });
});
