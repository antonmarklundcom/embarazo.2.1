import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { NombresLink, NombresLinkView } from "./NombresLink";

// Growth plan item 19: the nombres.com.py link exists only while the
// `nombres_link` flag is on.

function renderWithFlags(flags: Record<string, boolean>): string {
  const client = new QueryClient();
  // The same cache key `useFlag` reads; a seeded, fresh entry means no fetch.
  client.setQueryData(["flags"], flags);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(NombresLink, { className: "mt-2" }),
    ),
  );
}

describe("the nombres.com.py link", () => {
  it("renders nothing while the flag is off", () => {
    expect(renderToStaticMarkup(createElement(NombresLinkView, { enabled: false }))).toBe("");
    expect(renderWithFlags({ nombres_link: false })).toBe("");
    // No answer yet / failed fetch: the key's default (off) applies.
    expect(renderWithFlags({})).toBe("");
  });

  it("renders one plain outbound link when the flag is on", () => {
    for (const markup of [
      renderToStaticMarkup(createElement(NombresLinkView, { enabled: true })),
      renderWithFlags({ nombres_link: true }),
    ]) {
      expect(markup).toContain("Buscá ideas de nombres en nombres.com.py");
      expect(markup).toContain('href="https://nombres.com.py"');
      expect(markup).toContain('target="_blank"');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).not.toContain("?");
      expect(markup.match(/<a /g)).toHaveLength(1);
    }
  });
});
