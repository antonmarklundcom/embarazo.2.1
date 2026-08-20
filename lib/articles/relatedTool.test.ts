import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { ARTICLES } from "@/lib/seed/articles";
import { RELATED_TOOLS, relatedTool } from "./relatedTool";

// The point of a map instead of an `<a>` in the article HTML: this can be
// checked. A link inside a blob of markup rots into a 404 silently.

describe("relatedTool", () => {
  it("only names guías that exist", () => {
    const slugs = new Set(ARTICLES.map((article) => article.slug));
    for (const slug of Object.keys(RELATED_TOOLS)) {
      expect(slugs.has(slug), `no such guía: ${slug}`).toBe(true);
    }
  });

  it("only points at routes that exist", () => {
    for (const [slug, tool] of Object.entries(RELATED_TOOLS)) {
      const page = join(process.cwd(), "app", "(app)", tool.href.slice(1), "page.tsx");
      expect(existsSync(page), `${slug} → ${tool.href}`).toBe(true);
    }
  });

  it("stays sparse", () => {
    // A related tool on every article is a template slot somebody fills with
    // the nearest-looking tool, at which point the link stops meaning anything.
    expect(Object.keys(RELATED_TOOLS).length).toBeLessThan(ARTICLES.length / 2);
  });

  it("has nothing to say about a guía it does not know", () => {
    expect(relatedTool("una-guia-cualquiera")).toBeNull();
  });
});
