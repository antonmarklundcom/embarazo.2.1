import { describe, expect, it } from "vitest";

import { BABY_ALARM_SIGNS, BABY_STAGES, feedingLines, SLEEP_LINES, stageFor, VACCINE_LINES } from "./content";

// Growth plan item 9 (G2) — the rules the baby home reads.

const age = (months: number) => ({ days: months * 30, weeks: Math.floor((months * 30) / 7), months });

describe("stageFor", () => {
  it("covers every month of the first year exactly once", () => {
    for (let m = 0; m <= 12; m += 1) {
      expect(BABY_STAGES.filter((s) => m >= s.fromMonths && m <= s.toMonths), `month ${m}`).toHaveLength(1);
    }
    expect(stageFor(age(0)).id).toBe("0-2");
    expect(stageFor(age(5)).id).toBe("3-5");
    expect(stageFor(age(6)).id).toBe("6-8");
    expect(stageFor(age(12)).id).toBe("9-12");
    expect(stageFor(age(20)).id).toBe("9-12");
  });

  it("names every image in docs/imagery-manifest.json", async () => {
    const { readFileSync } = await import("node:fs");
    const manifest = JSON.parse(readFileSync("docs/imagery-manifest.json", "utf8")) as {
      baby: { file: string }[];
    };
    const files = manifest.baby.map((entry) => entry.file);
    for (const stage of BABY_STAGES) expect(files).toContain(`public${stage.image}`);
  });
});

describe("the copy", () => {
  it("switches from exclusive breastfeeding to complementary food at 6 months", () => {
    expect(feedingLines(age(5)).join(" ")).toMatch(/solo leche materna/);
    expect(feedingLines(age(6)).join(" ")).toMatch(/otros alimentos/);
  });

  it("never gives a dose or a number of milligrams or millilitres", () => {
    const all = [...feedingLines(age(1)), ...feedingLines(age(7)), ...SLEEP_LINES, ...BABY_ALARM_SIGNS, ...VACCINE_LINES].join(" ");
    expect(all).not.toMatch(/\b\d+\s?(mg|ml|mcg|gotas|cucharadas?)\b/i);
  });

  it("lists no vaccine names or ages until a sourced PAI calendar exists", () => {
    expect(VACCINE_LINES.join(" ")).not.toMatch(/BCG|hepatitis|pentavalente|rotavirus|neumococo|\d+\s?meses/i);
  });
});
