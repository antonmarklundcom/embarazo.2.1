import { describe, expect, it } from "vitest";

import { navTabs } from "./tabs";

// Growth plan item 12: "Cerca tuyo" is hidden while it has nothing published,
// never deleted — and the other four tabs never move.
describe("navTabs", () => {
  it("shows all five tabs when Cerca tuyo has content", () => {
    expect(navTabs(true)).toEqual(["today", "guides", "checklist", "tools", "nearby"]);
  });

  it("drops only Cerca tuyo when it is empty", () => {
    expect(navTabs(false)).toEqual(["today", "guides", "checklist", "tools"]);
  });

  it("keeps the same tab count for the same answer", () => {
    // The count is a function of the one boolean the server passes down, so the
    // server render and the hydrated nav always agree.
    expect(navTabs(false)).toHaveLength(4);
    expect(navTabs(true)).toHaveLength(5);
  });
});
