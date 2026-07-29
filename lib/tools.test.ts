import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_TONE_CLASS, toolsForRole } from "./tools";

describe("TOOLS", () => {
  it("has no duplicate destinations", () => {
    const hrefs = TOOLS.map((t) => t.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every tool a tone that maps to a real class", () => {
    for (const tool of TOOLS) {
      expect(TOOL_TONE_CLASS[tool.tone]).toBeTruthy();
    }
  });
});

describe("toolsForRole", () => {
  it("gives the mother everything", () => {
    expect(toolsForRole(true)).toHaveLength(TOOLS.length);
  });

  it("hides tools that record the mother's own data from other roles", () => {
    // A partner has no belly photos, no carné and no weight to log here.
    // Offering them is confusing at best and wrong at worst.
    const shared = toolsForRole(false);
    expect(shared.length).toBeLessThan(TOOLS.length);
    for (const tool of shared) {
      expect(tool.ownerOnly).toBeFalsy();
    }
  });

  it("still gives other roles the shared surfaces", () => {
    const hrefs = toolsForRole(false).map((t) => t.href);
    expect(hrefs).toContain("/emergencia");
    expect(hrefs).toContain("/guias");
    expect(hrefs).toContain("/derechos");
  });
});
