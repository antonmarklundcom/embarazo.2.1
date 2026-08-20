import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ARTICLES } from "../seed/articles";
import { ARTICLE_INDEX } from "./loadIndex";
import { indexEntryOf } from "./index";
import { readingMinutes } from "./readTime";

// K11 — the index is generated and committed, which makes staleness the risk.
//
// `readTime.ts` says a read time must never be stored, because a stored figure
// is one somebody has to remember to update and the first edit that skips it
// makes every other one untrustworthy. The index stores one. This file is the
// reason that is still true: nobody maintains the number, the build does, and
// if the committed index and the content disagree, this fails.

describe("the committed article index matches the content", () => {
  it("is exactly what the generator would write today", () => {
    // The whole check, in one assertion: regenerate from the articles and
    // compare. A title edited in articles.json, a week range changed, a new
    // guía added, a body rewritten long enough to change its read time — all
    // land here, on whoever made the edit.
    expect(ARTICLE_INDEX).toEqual(ARTICLES.map(indexEntryOf));
  });

  it("is the file on disk, formatted the way the generator formats it", () => {
    // Guards against a hand-edit that happens to parse to the right value but
    // would be rewritten by the next `npm run build`, leaving a dirty tree.
    const onDisk = readFileSync(
      join(process.cwd(), "lib", "articles", "index.json"),
      "utf8",
    );
    expect(onDisk).toBe(`${JSON.stringify(ARTICLES.map(indexEntryOf), null, 2)}\n`);
  });

  it("covers every article, and nothing else", () => {
    expect(ARTICLE_INDEX.map((e) => e.slug).sort()).toEqual(
      ARTICLES.map((a) => a.slug).sort(),
    );
  });

  it("agrees with the runtime read-time calculation", () => {
    // Belt and braces on the one derived field: precomputing it must not have
    // changed what it says.
    for (const article of ARTICLES) {
      const entry = ARTICLE_INDEX.find((e) => e.slug === article.slug)!;
      expect(entry.minutes, article.slug).toBe(readingMinutes(article.html));
      expect(entry.minutes, article.slug).toBeGreaterThan(0);
    }
  });
});

describe("the index carries what a rail needs and no more", () => {
  it("has no article body", () => {
    // The point of the exercise. `html` in the index would put ~17 kB back in
    // the home screen's First Load JS, silently.
    for (const entry of ARTICLE_INDEX) {
      expect(Object.keys(entry).sort(), entry.slug).toEqual(
        Object.keys(entry)
          .filter((k) => !["html", "excerpt", "author", "reviewedBy", "date"].includes(k))
          .sort(),
      );
    }
  });

  it("keeps the week range together or absent, like the schema does", () => {
    for (const entry of ARTICLE_INDEX) {
      expect(
        (entry.fromWeek === undefined) === (entry.toWeek === undefined),
        entry.slug,
      ).toBe(true);
    }
  });
});

describe("the home rails do not import the articles", () => {
  // The regression this prevents is a one-line import added in a hurry —
  // `import { ARTICLES }` in a client component puts the bodies and zod back
  // in the home bundle, and nothing visible changes, which is precisely why
  // nobody would notice.
  const CLIENT_SURFACES = [
    join("components", "WeekArticleFeed.tsx"),
    join("components", "PopularThisWeek.tsx"),
    join("lib", "articles", "loadIndex.ts"),
  ];

  it("reads the index instead of the seed loader", () => {
    for (const file of CLIENT_SURFACES) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/from "@\/lib\/seed\/articles"/);
    }
  });

  it("does not pull zod into a home rail", () => {
    for (const file of CLIENT_SURFACES) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/from "zod"|content\/schemas/);
    }
  });
});
