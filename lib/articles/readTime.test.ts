import { describe, expect, it } from "vitest";

import {
  WORDS_PER_MINUTE,
  countWords,
  readTimeLabel,
  readingMinutes,
  textFromHtml,
} from "./readTime";
import { ARTICLES } from "../seed/articles";

// BUILD-PLAN C6 (feature map #17). Read time is computed, not stored, so the
// tests are about the computation being right on real article HTML rather than
// about a number staying in sync with a field.

describe("textFromHtml", () => {
  it("does not glue two words together across a tag", () => {
    // The bug this exists for: "<li>uno</li><li>dos</li>" counted as one word,
    // which quietly halves the read time of every list-heavy guía — and the
    // practical ones are all list-heavy.
    expect(textFromHtml("<li>uno</li><li>dos</li>")).toBe("uno dos");
    expect(countWords("<li>uno</li><li>dos</li>")).toBe(2);
  });

  it("drops entities instead of counting them as words", () => {
    expect(countWords("<p>uno&nbsp;dos &mdash; tres</p>")).toBe(3);
  });

  it("counts nothing in an empty or tags-only document", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("<p></p>")).toBe(0);
  });
});

describe("readingMinutes", () => {
  it("scales with length", () => {
    const words = (n: number) => `<p>${"palabra ".repeat(n).trim()}</p>`;
    expect(readingMinutes(words(WORDS_PER_MINUTE))).toBe(1);
    expect(readingMinutes(words(WORDS_PER_MINUTE * 4))).toBe(4);
  });

  it("never says zero minutes", () => {
    // "0 min de lectura" reads as broken, and rounding gets there fast.
    expect(readingMinutes("<p>Hola.</p>")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("labels in es-PY", () => {
    expect(readTimeLabel("<p>Hola.</p>")).toBe("1 min de lectura");
  });
});

describe("against the real guías", () => {
  it("gives every shipped article a believable figure", () => {
    for (const article of ARTICLES) {
      const minutes = readingMinutes(article.html);
      expect(minutes, article.slug).toBeGreaterThanOrEqual(1);
      // The longest guía today is derechos laborales at ~2.5 kB of HTML. A
      // figure above 15 means the tag-stripping broke, not that somebody wrote
      // an essay.
      expect(minutes, article.slug).toBeLessThanOrEqual(15);
    }
  });
});
