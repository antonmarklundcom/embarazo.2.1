import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  SHARE_FORBIDDEN_FIELDS,
  SHARE_MILESTONES,
  SHARE_SITE,
  bumpFrameContent,
  canShareFiles,
  shareEyebrow,
  shareFileName,
  shareHeadline,
  shareText,
  weekCardContent,
} from "./card";
import { drawBumpFrame, drawWeekCard } from "./draw";
import { partnerShareText, partnerWhatsAppUrl } from "./partner";
import { perspectivesFor } from "@/lib/seed/perspectives";

// BUILD-PLAN E2: "health details never leave beyond the week number; the photo
// is composited on device." Both halves are properties of the code rather than
// of any one function's output, so both are asserted against the source.
//
// Share card v2 widened the whitelist with fields *derived from the week*
// (size, trimester, milestone). The tests below pin the new key set, and — the
// part that keeps the rule honest — assert that every field is a function of
// the week alone: two calls for the same week are identical, whoever makes them.

const WEEKS = Array.from({ length: 42 }, (_, i) => i + 1);

/** A forbidden field as a whole word, so "note" does not trip on "notebook". */
function mentions(text: string, field: string): boolean {
  return new RegExp(`\\b${field}\\b`, "i").test(text);
}

describe("what a shared image may carry", () => {
  const KEYS = ["brand", "milestone", "site", "size", "tagline", "trimester", "week"];

  it("is the week, what the week implies, and fixed brand lines — nothing else", () => {
    const content = weekCardContent(24);
    expect(Object.keys(content).sort()).toEqual(KEYS);
    expect(content.week).toBe(24);
  });

  it("says the same about the bump frame", () => {
    expect(Object.keys(bumpFrameContent(24)).sort()).toEqual(KEYS);
  });

  it("derives every field from the week number alone", () => {
    // A pure function of the week: nothing else can be in it. Same week,
    // same card — for every user in that week.
    for (const week of WEEKS) {
      expect(weekCardContent(week)).toEqual(weekCardContent(week));
      expect(bumpFrameContent(week)).toEqual(bumpFrameContent(week));
      expect(weekCardContent(week).site).toBe(SHARE_SITE);
    }
  });

  it("carries the week's size, trimester and milestone", () => {
    const twenty = weekCardContent(20);
    expect(twenty.size).toBe("Del tamaño de una banana");
    expect(twenty.trimester).toBe(2);
    expect(twenty.milestone).toBe("Mitad del camino");

    expect(weekCardContent(6).trimester).toBe(1);
    expect(weekCardContent(6).milestone).toBeNull();
    expect(weekCardContent(35).trimester).toBe(3);
  });

  it("has no size line for weeks 1–2, where there is no embryo to compare", () => {
    expect(weekCardContent(1).size).toBeNull();
    expect(weekCardContent(2).size).toBeNull();
    expect(weekCardContent(3).size).toMatch(/^Del tamaño de /);
  });

  it("labels the special weeks and leaves the rest to the trimester", () => {
    expect(Object.keys(SHARE_MILESTONES).map(Number).sort((a, b) => a - b)).toEqual([
      12, 20, 28, 37, 40,
    ]);
    expect(shareEyebrow(weekCardContent(24))).toBe("SEMANA 24 · 2.º TRIMESTRE");
    expect(shareEyebrow(weekCardContent(20))).toBe("MITAD DEL CAMINO");
    expect(shareEyebrow(weekCardContent(12))).toBe("FIN DEL PRIMER TRIMESTRE");
    expect(shareHeadline(weekCardContent(20))).toBe("¡Semana 20!");
  });

  it("puts only the week and its size in the caption", () => {
    expect(shareText(20)).toBe("¡Semana 20! Mi bebé ya es del tamaño de una banana 💛");
    for (const week of WEEKS) {
      expect(shareText(week)).toContain(String(week));
      for (const field of SHARE_FORBIDDEN_FIELDS) {
        expect(mentions(shareText(week), field), `${week}: ${field}`).toBe(false);
      }
    }
  });

  it("has no size in the caption for weeks 1–2", () => {
    expect(shareText(1)).toBe("¡Semana 1! 💛");
    expect(shareText(2)).toBe("¡Semana 2! 💛");
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
      code(read("lib", "share", "partner.ts")),
      code(read("components", "ShareCard.tsx")),
    ]) {
      for (const forbidden of ["fetch(", "XMLHttpRequest", "axios", "/api/"]) {
        expect(source.includes(forbidden), forbidden).toBe(false);
      }
    }
  });

  it("keeps links out of the drawing module", () => {
    // The WhatsApp hand-off lives in partner.ts; the canvas code draws and
    // does nothing else.
    const drawing = code(read("lib", "share", "draw.ts"));
    for (const forbidden of ["wa.me", "http:", "https:", "window.open", "location"]) {
      expect(drawing.includes(forbidden), forbidden).toBe(false);
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

// ---------------------------------------------------------------------------
// The drawing, run against a recording context
// ---------------------------------------------------------------------------

/**
 * A stand-in 2D context that records every `fillText` and accepts anything
 * else as a no-op. Enough to assert *what text* the image carries without a
 * real canvas in Node; Path2D is stubbed below to see *whether the baby is
 * drawn*.
 */
function recordingContext(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const gradient = { addColorStop: () => {} };
  const target: Record<string, unknown> = {
    fillText: (text: string) => texts.push(text),
    measureText: (text: string) => ({ width: text.length * 30 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
  };
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : () => {}),
    set: (t, key: string, value) => {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

let paths: string[] = [];
const realPath2D = (globalThis as { Path2D?: unknown }).Path2D;

beforeEach(() => {
  paths = [];
  (globalThis as { Path2D?: unknown }).Path2D = class {
    constructor(d?: string) {
      paths.push(d ?? "");
    }
  };
});

afterEach(() => {
  (globalThis as { Path2D?: unknown }).Path2D = realPath2D;
});

describe("drawWeekCard", () => {
  it("draws only the whitelisted strings", () => {
    for (const week of WEEKS) {
      const content = weekCardContent(week);
      const { ctx, texts } = recordingContext();
      drawWeekCard(ctx, content);
      // A long size line may wrap onto two lines; rejoin before comparing.
      expect(texts.slice(0, 2)).toEqual([shareEyebrow(content), shareHeadline(content)]);
      expect(texts.slice(2, -1).join(" ")).toBe(content.size ?? content.tagline);
      expect(texts.at(-1)).toBe(`${content.brand} · ${content.site}`);
    }
  });

  it("draws the baby from week 9, and only a glow before it", () => {
    const early = recordingContext();
    drawWeekCard(early.ctx, weekCardContent(8));
    expect(paths).toEqual([]);

    const later = recordingContext();
    drawWeekCard(later.ctx, weekCardContent(9));
    expect(paths.some((d) => d.startsWith("M62 150"))).toBe(true);
  });
});

describe("drawBumpFrame", () => {
  it("draws the header, the tagline and the pill around the photo", () => {
    const content = bumpFrameContent(20);
    const { ctx, texts } = recordingContext();
    drawBumpFrame(ctx, content, { width: 900, height: 1200 } as unknown as HTMLCanvasElement);
    expect(texts).toEqual([
      "MITAD DEL CAMINO",
      "¡Semana 20!",
      "Mi pancita esta semana",
      `${content.brand} · ${content.site}`,
    ]);
  });
});

// ---------------------------------------------------------------------------
// "Contale a tu pareja"
// ---------------------------------------------------------------------------

describe("partnerShareText", () => {
  it("is the week's partner perspective, prefixed with the week", () => {
    const band = perspectivesFor(20)!;
    expect(partnerShareText(20, undefined)).toBe(`Semana 20 — ${band.pareja}`);
  });

  it("adds the app's link only when there is a real one", () => {
    expect(partnerShareText(20, "https://app.embarazo.com.py")).toMatch(
      /\n\nLo leí en Mi Bebé: https:\/\/app\.embarazo\.com\.py$/,
    );
    expect(partnerShareText(20, "  ")).not.toContain("http");
    expect(partnerShareText(20, "javascript:alert(1)")).not.toContain("javascript");
  });

  it("carries nothing personal, for any week", () => {
    // Asserted as "exactly the fixed content", not as a word ban: the shipped
    // partner copy legitimately says "el sanatorio" about sanatorios in
    // general. What must not be in it is anything of hers, and the only
    // inputs are the week and the app's public URL.
    for (const week of WEEKS) {
      const band = perspectivesFor(week);
      const text = partnerShareText(week, "https://app.embarazo.com.py");
      if (!band) {
        expect(text).toBeNull();
        continue;
      }
      expect(text).toBe(
        `Semana ${week} — ${band.pareja}\n\nLo leí en Mi Bebé: https://app.embarazo.com.py`,
      );
    }
  });

  it("opens WhatsApp's contact picker with the text, and no number", () => {
    const text = partnerShareText(20, undefined)!;
    const url = partnerWhatsAppUrl(text);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.slice("https://wa.me/?text=".length))).toBe(text);
  });
});
