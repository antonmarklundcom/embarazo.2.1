import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/cuenta/actions", () => ({
  signOutAction: vi.fn(async () => {}),
}));

import { AccountCard } from "./AccountCard";

// The onError fallback only runs in a browser, and this suite is node-only, so
// the failing-image path is not exercised here. These cases pin the render
// contract both paths share: a present image renders <img>, and an absent one
// renders the initial, which is what a failed image falls back to.

function session(user: { name?: string | null; email?: string | null; image?: string | null }): Session {
  return { user: { id: "u1", ...user }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

describe("AccountCard avatar", () => {
  it("renders the provider image when one is present", () => {
    const markup = renderToStaticMarkup(createElement(AccountCard, {
      session: session({ name: "Ana", email: "ana@example.com", image: "https://lh3.googleusercontent.com/a/abc" }),
    }));
    expect(markup).toContain("<img");
    expect(markup).toContain('src="https://lh3.googleusercontent.com/a/abc"');
  });

  it("renders the initial when the image is absent", () => {
    const markup = renderToStaticMarkup(createElement(AccountCard, {
      session: session({ name: "Ana", email: "ana@example.com", image: null }),
    }));
    expect(markup).not.toContain("<img");
    expect(markup).toContain(">A</div>");
  });
});
