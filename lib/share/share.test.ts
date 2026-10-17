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
  shareWeekLine,
  cardNickname,
  NICKNAME_MAX,
  shareText,
  weekCardContent,
} from "./card";
import { drawBumpFrame, drawWeekCard } from "./draw";
import { partnerShareText, partnerWhatsAppUrl } from "./partner";
import { perspectivesFor } from "@/lib/seed/perspectives";
import { HERO_THEMES, THEME_IDS, bareInk, type ThemeId } from "@/lib/hero/themes";

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
  // Growth plan item 11 added `nickname`: the one field that is hers, null
  // unless she ticks "Con el apodo", and always null on the bump frame.
  const KEYS = ["brand", "milestone", "nickname", "site", "size", "tagline", "trimester", "week"];

  it("is the week, what the week implies, and fixed brand lines — nothing else", () => {
    const content = weekCardContent(24);
    expect(Object.keys(content).sort()).toEqual(KEYS);
    expect(content.week).toBe(24);
  });

  it("says the same about the bump frame", () => {
    expect(Object.keys(bumpFrameContent(24)).sort()).toEqual(KEYS);
  });

  it("carries the nickname only when it is passed, trimmed and capped", () => {
    expect(weekCardContent(20).nickname).toBeNull();
    expect(weekCardContent(20, "   ").nickname).toBeNull();
    expect(weekCardContent(20, "  Mateo ").nickname).toBe("Mateo");
    expect(weekCardContent(20, "Mateo").week).toBe(20);
    expect(cardNickname("Ana Sofía y María Belén de los Ángeles")!.length).toBeLessThanOrEqual(NICKNAME_MAX);
    expect(bumpFrameContent(20).nickname).toBeNull();
    // The nickname becomes the headline, so the week moves under the picture.
    expect(shareHeadline(weekCardContent(20, "Mateo"))).toBe("Mateo");
    expect(shareHeadline(weekCardContent(20))).toBe("¡Semana 20!");
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
    expect(twenty.size).toBe("Referencia de peso: un mango");
    expect(shareWeekLine(twenty)).toBe("Semana 20 · Referencia de peso: un mango");
    expect(twenty.trimester).toBe(2);
    expect(twenty.milestone).toBe("Mitad del camino");

    expect(weekCardContent(6).trimester).toBe(1);
    expect(weekCardContent(6).milestone).toBeNull();
    expect(weekCardContent(35).trimester).toBe(3);
  });

  it("has no size line for weeks 1–2, where there is no embryo to compare", () => {
    expect(weekCardContent(1).size).toBeNull();
    expect(weekCardContent(2).size).toBeNull();
    expect(weekCardContent(3).size).toBe("Todavía microscópico");
    expect(shareWeekLine(weekCardContent(3))).toBe("Semana 3 · Todavía microscópico");
    expect(shareWeekLine(weekCardContent(1))).toBe(weekCardContent(1).tagline);
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

  it("makes share text and PNG captions distinguish illustrative length from weight", () => {
    expect(weekCardContent(15).size).toBe("Referencia de longitud: una manzana");
    expect(shareText(3)).toBe("¡Semana 3! Todavía microscópico 💛");
    expect(shareText(40)).toBe("¡Semana 40! Referencia de peso: una sandía. Comparación ilustrativa 💛");
    expect(shareText(20)).toBe("¡Semana 20! Referencia de peso: un mango. Comparación ilustrativa 💛");
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
function recordingContext(): {
  ctx: CanvasRenderingContext2D;
  texts: string[];
  /** Colour stops added to any gradient, in order. */
  stops: string[];
  /** The fill in force for each fillRect: a gradient object or a colour. */
  grounds: unknown[];
  /** The fill in force for each fillText, in the same order as `texts`. */
  inks: unknown[];
} {
  const texts: string[] = [];
  const stops: string[] = [];
  const grounds: unknown[] = [];
  const inks: unknown[] = [];
  const gradient = { addColorStop: (_offset: number, color: string) => stops.push(color) };
  const target: Record<string, unknown> = {
    fillText: (text: string) => {
      texts.push(text);
      inks.push(target.fillStyle);
    },
    fillRect: () => grounds.push(target.fillStyle),
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
  return { ctx, texts, stops, grounds, inks };
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
      expect(texts.slice(2, -1).join(" ")).toBe(shareWeekLine(content));
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

describe("drawWeekCard with the week's illustration (growth plan 11)", () => {
  it("draws the picture instead of the drawn baby, and the same strings", () => {
    const drawn: unknown[] = [];
    const { ctx, texts } = recordingContext();
    (ctx as unknown as { drawImage: (...args: unknown[]) => void }).drawImage = (...args) => drawn.push(args[0]);
    const art = { width: 640, height: 640 } as unknown as CanvasImageSource & { width: number; height: number };
    const content = weekCardContent(20, "Mateo");
    drawWeekCard(ctx, content, art);
    expect(drawn).toEqual([art]);
    expect(paths.some((d) => d.startsWith("M62 150"))).toBe(false);
    expect(texts[1]).toBe("Mateo");
    expect(texts.slice(2, -1).join(" ")).toBe("Semana 20 · Referencia de peso: un mango");
  });
});

describe("the ground follows the hero theme she chose", () => {
  /** The hex colours a CSS gradient string names, in order. */
  const cssColours = (background: string) => background.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  const TRIMESTER_2 = "#D9E5EC";
  const photo = { width: 900, height: 1200 } as unknown as HTMLCanvasElement;

  it("draws the chosen theme's gradient, with the colours of its CSS background", () => {
    for (const id of THEME_IDS) {
      const { ctx, stops, grounds } = recordingContext();
      drawWeekCard(ctx, weekCardContent(20), undefined, id);
      expect(typeof grounds[0], id).toBe("object");
      expect(stops, id).toEqual(cssColours(HERO_THEMES[id].background));
    }
  });

  it("uses the theme's own bare ink for the text, so it stays legible on each ground", () => {
    for (const id of THEME_IDS) {
      const { ctx, texts, inks } = recordingContext();
      drawWeekCard(ctx, weekCardContent(20), undefined, id);
      const ink = bareInk(HERO_THEMES[id]).strong;
      expect(inks[texts.indexOf("¡Semana 20!")], id).toBe(ink);
      // The size line, which may wrap onto two lines.
      for (let i = 2; i < texts.length - 1; i++) expect(inks[i], `${id}: ${texts[i]}`).toBe(ink);
    }
    // Dark ink on the five pastels, white on the dark night theme.
    expect(bareInk(HERO_THEMES.estrellas).strong).toBe("#FFFFFF");
    expect(bareInk(HERO_THEMES.halo).strong).toBe("#322E29");
  });

  it("keeps the trimester pastel and its own ink when no theme is chosen", () => {
    const absent = recordingContext();
    drawWeekCard(absent.ctx, weekCardContent(20));
    expect(absent.grounds[0]).toBe(TRIMESTER_2);
    expect(absent.stops).toEqual([]);
    expect(absent.inks[1]).toBe("#322E29");
  });

  it("treats null, undefined and an unknown id the same as no choice", () => {
    for (const theme of [null, undefined, "no-existe" as ThemeId]) {
      const { ctx, grounds, stops } = recordingContext();
      drawWeekCard(ctx, weekCardContent(20), undefined, theme);
      expect(grounds[0], String(theme)).toBe(TRIMESTER_2);
      expect(stops, String(theme)).toEqual([]);
    }
  });

  it("follows the trimester for each pastel when no theme is chosen", () => {
    const expected = { 1: "#DFE8D8", 2: "#D9E5EC", 3: "#F3DAD4" } as const;
    for (const week of [6, 20, 35] as const) {
      const { ctx, grounds } = recordingContext();
      drawWeekCard(ctx, weekCardContent(week));
      expect(grounds[0], String(week)).toBe(expected[weekCardContent(week).trimester]);
    }
  });

  it("gives the bump frame the same choice", () => {
    const chosen = recordingContext();
    drawBumpFrame(chosen.ctx, bumpFrameContent(20), photo, "nanduti");
    expect(chosen.stops).toEqual(cssColours(HERO_THEMES.nanduti.background));

    const absent = recordingContext();
    drawBumpFrame(absent.ctx, bumpFrameContent(20), photo);
    expect(absent.grounds[0]).toBe(TRIMESTER_2);
    expect(absent.stops).toEqual([]);
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
