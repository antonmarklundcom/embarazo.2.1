import { describe, expect, it } from "vitest";
import {
  babyAtWeekLabel,
  babyNamesList,
  isTwinsOrMore,
  primaryBabyName,
} from "./babies";

describe("primaryBabyName", () => {
  it("returns undefined when there are no babies", () => {
    expect(primaryBabyName(undefined)).toBeUndefined();
    expect(primaryBabyName([])).toBeUndefined();
  });

  it("returns undefined for a blank/whitespace-only name", () => {
    expect(primaryBabyName([{ name: "" }])).toBeUndefined();
    expect(primaryBabyName([{ name: "   " }])).toBeUndefined();
  });

  it("returns the first baby's trimmed name", () => {
    expect(primaryBabyName([{ name: " Silvia " }])).toBe("Silvia");
  });

  it("ignores later babies", () => {
    expect(primaryBabyName([{ name: "Silvia" }, { name: "Mateo" }])).toBe("Silvia");
  });
});

describe("isTwinsOrMore", () => {
  it("is false for 0 or 1 babies", () => {
    expect(isTwinsOrMore(undefined)).toBe(false);
    expect(isTwinsOrMore([])).toBe(false);
    expect(isTwinsOrMore([{ name: "Silvia" }])).toBe(false);
  });

  it("is true for 2 or more", () => {
    expect(isTwinsOrMore([{ name: "Silvia" }, { name: "Mateo" }])).toBe(true);
    expect(isTwinsOrMore([{}, {}, {}])).toBe(true);
  });
});

describe("babyAtWeekLabel", () => {
  it("falls back to Tu bebé with no nickname", () => {
    expect(babyAtWeekLabel(undefined, 24)).toBe("Tu bebé a las 24 semanas");
    expect(babyAtWeekLabel([], 24)).toBe("Tu bebé a las 24 semanas");
    expect(babyAtWeekLabel([{}], 24)).toBe("Tu bebé a las 24 semanas");
  });

  it("uses the nickname when set", () => {
    expect(babyAtWeekLabel([{ name: "Silvia" }], 24)).toBe("Silvia a las 24 semanas");
  });

  it("falls back for unnamed twins rather than guessing an order", () => {
    expect(babyAtWeekLabel([{}, {}], 24)).toBe("Tu bebé a las 24 semanas");
  });
});

describe("babyNamesList", () => {
  it("returns undefined with no named babies", () => {
    expect(babyNamesList(undefined)).toBeUndefined();
    expect(babyNamesList([{}, {}])).toBeUndefined();
  });

  it("returns the single name", () => {
    expect(babyNamesList([{ name: "Silvia" }])).toBe("Silvia");
  });

  it("joins two names with y", () => {
    expect(babyNamesList([{ name: "Silvia" }, { name: "Mateo" }])).toBe("Silvia y Mateo");
  });

  it("joins three+ names with commas and a final y", () => {
    expect(babyNamesList([{ name: "Silvia" }, { name: "Mateo" }, { name: "Ana" }])).toBe(
      "Silvia, Mateo y Ana",
    );
  });

  it("skips unnamed babies in the list", () => {
    expect(babyNamesList([{ name: "Silvia" }, {}])).toBe("Silvia");
  });
});
