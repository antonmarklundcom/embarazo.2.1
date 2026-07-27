import { describe, expect, it } from "vitest";
import { countWords, readingMinutes, readingTimeLabel } from "./readingTime";

describe("countWords", () => {
  it("ignores tags and entities", () => {
    expect(countWords("<p>hola <strong>qué</strong> tal</p>")).toBe(3);
    // Entities collapse to whitespace and are not counted: "&" is not a word
    // anyone spends reading time on.
    expect(countWords("<p>uno &amp; dos</p>")).toBe(2);
  });

  it("handles empty and whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("<p>   </p>")).toBe(0);
  });
});

describe("readingMinutes", () => {
  it("never returns zero — '0 min' reads like a bug", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("<p>hola</p>")).toBe(1);
  });

  it("scales with length", () => {
    const words = (n: number) => `<p>${Array(n).fill("palabra").join(" ")}</p>`;
    expect(readingMinutes(words(180))).toBe(1);
    expect(readingMinutes(words(540))).toBe(3);
    expect(readingMinutes(words(900))).toBe(5);
  });

  it("puts a typical 600–900 word guía in the 3–5 min range", () => {
    const words = (n: number) => `<p>${Array(n).fill("palabra").join(" ")}</p>`;
    expect(readingMinutes(words(600))).toBeGreaterThanOrEqual(3);
    expect(readingMinutes(words(900))).toBeLessThanOrEqual(5);
  });
});

describe("readingTimeLabel", () => {
  it("formats in es-PY", () => {
    expect(readingTimeLabel("<p>hola</p>")).toBe("1 min");
  });
});
