import { describe, expect, it } from "vitest";

import { WEEKLY_TIP_HOUR } from "@/lib/push/weekly";
import { babyAgeSentence, babyAgeTimes } from "./push";

// Growth plan item 9 (G3) — the notice schedule after a birth date.

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const day = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

describe("babyAgeTimes", () => {
  const born = at(2026, 1, 15, 3);

  it("is weekly for 8 weeks, then monthly, at the tip hour", () => {
    const times = babyAgeTimes(born, at(2026, 1, 15, 4), 20);
    expect(times.slice(0, 8).map(day)).toEqual([
      "2026-1-22", "2026-1-29", "2026-2-5", "2026-2-12", "2026-2-19", "2026-2-26", "2026-3-5", "2026-3-12",
    ]);
    // Week 8 is 12 March; the 2-month birthday (15 March) is the first monthly one.
    expect(times.slice(8, 11).map(day)).toEqual(["2026-3-15", "2026-4-15", "2026-5-15"]);
    for (const t of times) expect(new Date(t).getHours()).toBe(WEEKLY_TIP_HOUR);
  });

  it("stops at the first birthday", () => {
    const times = babyAgeTimes(born, at(2026, 1, 15, 4), 60);
    expect(day(times[times.length - 1]!)).toBe("2027-1-15");
    expect(babyAgeTimes(born, at(2027, 1, 16))).toEqual([]);
  });

  it("never returns the past and caps the queue", () => {
    const now = at(2026, 6, 1);
    const times = babyAgeTimes(born, now);
    expect(times.every((t) => t > now)).toBe(true);
    expect(times.length).toBeLessThanOrEqual(12);
    expect(day(times[0]!)).toBe("2026-6-15");
  });

  it("puts a 31st birthday on the last day of a short month", () => {
    const times = babyAgeTimes(at(2026, 1, 31), at(2026, 1, 31, 13), 60).map(day);
    expect(times).toContain("2026-4-30");
    expect(times).not.toContain("2026-5-1");
  });
});

describe("babyAgeSentence", () => {
  const born = at(2026, 1, 15);
  it("says cumple on the day, tiene otherwise", () => {
    expect(babyAgeSentence(born, at(2026, 1, 29, 10)).title).toBe("¡Tu bebé cumple 2 semanas!");
    expect(babyAgeSentence(born, at(2026, 4, 15, 10)).title).toBe("¡Tu bebé cumple 3 meses!");
    expect(babyAgeSentence(born, at(2026, 4, 17, 10)).title).toBe("Tu bebé tiene 3 meses");
    expect(babyAgeSentence(born, at(2027, 1, 15, 10)).title).toBe("¡Tu bebé cumple 1 año!");
  });

  it("never says semana of a pregnancy", () => {
    expect(babyAgeSentence(born, at(2026, 2, 1)).body).not.toMatch(/semana \d/);
  });
});
