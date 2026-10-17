import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/cuenta/actions", () => ({
  signOutAction: vi.fn(async () => {}),
}));

import { AccountCard } from "./AccountCard";

// The onError fallback only runs in a browser, and this suite is node-only, so
// the failing-image path is not exercised here. These cases pin the render
// contract both paths share: a present image renders <img>, and an absent one
// renders the initial, which is what a failed image falls back to.

describe("AccountCard avatar", () => {
  it("renders the provider image when one is present", () => {
    const markup = renderToStaticMarkup(createElement(AccountCard, {
      user: { name: "Ana", email: "ana@example.com", image: "https://lh3.googleusercontent.com/a/abc" },
    }));
    expect(markup).toContain("<img");
    expect(markup).toContain('src="https://lh3.googleusercontent.com/a/abc"');
  });

  it("renders the initial when the image is absent", () => {
    const markup = renderToStaticMarkup(createElement(AccountCard, {
      user: { name: "Ana", email: "ana@example.com", image: null },
    }));
    expect(markup).not.toContain("<img");
    expect(markup).toContain(">A</div>");
  });
});
