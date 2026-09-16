import { describe, expect, it } from "vitest";

import { compositeOver, contrastRatio, parseColor } from "./contrast";

// W3 — the measured contrast audit `docs/log/u7.md` said was missing.

describe("contrastRatio", () => {
  it("is 21:1 for black on white, the WCAG maximum", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 4.48:1 for the known #777/#fff pair", () => {
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("is symmetric and reads rgb()/rgba() the same as hex", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("rgb(119, 119, 119)", "rgba(255,255,255,1)")).toBeCloseTo(
      4.48,
      2,
    );
  });
});

describe("compositeOver", () => {
  it("flattens a translucent colour onto an opaque one", () => {
    const flat = compositeOver(parseColor("rgba(0,0,0,0.5)"), parseColor("#ffffff"));
    expect(flat).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });

  it("is a no-op for a fully opaque foreground", () => {
    const flat = compositeOver(parseColor("#123456"), parseColor("#ffffff"));
    expect(flat).toEqual({ r: 0x12, g: 0x34, b: 0x56, a: 1 });
  });
});
