import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  SHARE_FORBIDDEN_FIELDS,
  bumpFrameContent,
  canShareFiles,
  shareFileName,
  shareText,
  weekCardContent,
} from "./card";

// BUILD-PLAN E2: "health details never leave beyond the week number; the photo
// is composited on device." Both halves are properties of the code rather than
// of any one function's output, so both are asserted against the source.

describe("what a shared image may carry", () => {
  it("is the week, the wordmark and a fixed line — nothing else", () => {
    const content = weekCardContent(24);
    expect(Object.keys(content).sort()).toEqual(["brand", "tagline", "week"]);
    expect(content.week).toBe(24);
  });

  it("says the same about the bump frame", () => {
    expect(Object.keys(bumpFrameContent(24)).sort()).toEqual([
      "brand",
      "tagline",
      "week",
    ]);
  });

  it("puts only the week in the caption", () => {
    expect(shareText(24)).toContain("24");
    for (const field of SHARE_FORBIDDEN_FIELDS) {
      expect(shareText(24).toLowerCase()).not.toContain(field.toLowerCase());
    }
  });

  it("names the file so it can be found afterwards", () => {
    expect(shareFileName(24, "semana")).toBe("mi-bebe-semana-24.png");
    expect(shareFileName(24, "panza")).toBe("mi-bebe-panza-24.png");
  });
});

describe("canShareFiles", () => {
  const file = { name: "x.png" } as unknown as File;

  it("is false without the API", () => {
    expect(canShareFiles({}, file)).toBe(false);
  });

  it("is false when share exists but files are refused", () => {
    // Several browsers expose navigator.share and reject files. Sharing
    // "successfully" while sending nothing is worse than offering a download.
    expect(canShareFiles({ share: () => {}, canShare: () => false }, file)).toBe(false);
  });

  it("is false when canShare throws", () => {
    expect(
      canShareFiles(
        {
          share: () => {},
          canShare: () => {
            throw new Error("nope");
          },
        },
        file,
      ),
    ).toBe(false);
  });

  it("is true only when files are actually accepted", () => {
    expect(canShareFiles({ share: () => {}, canShare: () => true }, file)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Properties of the code, asserted against the source
// ---------------------------------------------------------------------------

function read(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("the photo is composited on device (§4.4)", () => {
  it("makes no request from the drawing or sharing path", () => {
    // A bump photo is the most private thing in this app. The property worth
    // asserting is not "we don't upload it" but "there is no code here that
    // could".
    for (const source of [
      code(read("lib", "share", "draw.ts")),
      code(read("lib", "share", "card.ts")),
      code(read("components", "ShareCard.tsx")),
    ]) {
      for (const forbidden of ["fetch(", "XMLHttpRequest", "axios", "/api/"]) {
        expect(source.includes(forbidden), forbidden).toBe(false);
      }
    }
  });

  it("draws nothing the whitelist does not name", () => {
    const drawing = code(read("lib", "share", "draw.ts"));
    for (const field of SHARE_FORBIDDEN_FIELDS) {
      expect(
        new RegExp(`\\b${field}\\b`, "i").test(drawing),
        `the share image must not draw "${field}"`,
      ).toBe(false);
    }
  });

  it("keeps the canvas a fixed portrait size", () => {
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBeGreaterThan(CARD_WIDTH);
  });
});
