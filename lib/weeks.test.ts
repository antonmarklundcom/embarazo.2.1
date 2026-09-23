import { describe, expect, it } from "vitest";

import { getWeek, hasSizeComparison, NO_EMBRYO_YET, sizeLine, WEEKS } from "./weeks";

// Weeks 1–2 have no size to compare — their `sizeComparison` is a sentence,
// not a noun — and the hero, the week page and its metadata all rendered it
// behind "Del tamaño de", producing "Del tamaño de todavía no hay embrión".

describe("sizeLine", () => {
  it("prefixes a real comparison", () => {
    expect(sizeLine("una lenteja")).toBe("Del tamaño de una lenteja");
    expect(sizeLine(getWeek(20).sizeComparison)).toBe("Del tamaño de una banana");
  });

  it("renders weeks 1–2 alone, without the prefix", () => {
    for (const week of [1, 2]) {
      const line = sizeLine(getWeek(week).sizeComparison);
      expect(line).toBe("Todavía no hay embrión");
      expect(line).not.toContain("Del tamaño de");
    }
  });

  it("never produces the broken sentence for any week", () => {
    for (const w of WEEKS) {
      expect(sizeLine(w.sizeComparison), `week ${w.week}`).not.toContain(
        `Del tamaño de ${NO_EMBRYO_YET}`,
      );
    }
  });
});

describe("hasSizeComparison", () => {
  it("is false exactly for weeks 1–2", () => {
    const without = WEEKS.filter((w) => !hasSizeComparison(w.sizeComparison)).map(
      (w) => w.week,
    );
    expect(without).toEqual([1, 2]);
  });
});

describe("formatLength / formatWeight", () => {
  it("uses the decimal comma and drops zeros a ruler would not show", async () => {
    const { formatLength } = await import("./weeks");
    expect(formatLength(26.7)).toBe("26,7 cm");
    expect(formatLength(0.01)).toBe("0,01 cm");
    expect(formatLength(0.1)).toBe("0,1 cm");
    expect(formatLength(30)).toBe("30 cm");
  });

  it("switches to kilos from 1000 g", async () => {
    const { formatWeight } = await import("./weeks");
    expect(formatWeight(360)).toBe("360 g");
    expect(formatWeight(2622)).toBe("2,6 kg");
    expect(formatWeight(3000)).toBe("3 kg");
  });
});
