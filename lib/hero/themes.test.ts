import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_THEME,
  HERO_THEMES,
  THEME_IDS,
  asThemeId,
  heroTheme,
  themeInk,
  bareInk,
  fallbackInk,
} from "./themes";
import { compositeOver, contrastRatio, parseColor, type RGBA } from "./contrast";

// U7. Pinned like `FLAG_KEYS` and `ADMIN_ACTIONS`: a theme is a thing every
// existing user can switch to and a new contrast pair somebody has to check,
// so adding one is a decision rather than a detail.

describe("the six themes", () => {
  it("is exactly this list, in this order", () => {
    expect([...THEME_IDS]).toEqual([
      "halo",
      "nanduti",
      "cielo",
      "estevia",
      "alas",
      "estrellas",
    ]);
  });

  it("defaults to the quietest one", () => {
    // A woman who never opens the sheet gets a warm glow, which is what the
    // renders' own lighting already does. A default that is a lace medallion
    // would be a design decision imposed on everybody who did not ask.
    expect(DEFAULT_THEME).toBe("halo");
    expect(HERO_THEMES[DEFAULT_THEME].motif).toBeNull();
  });

  it("declares a label, a background, an ink and a scrim for each", () => {
    for (const id of THEME_IDS) {
      const theme = heroTheme(id);
      expect(theme.id, id).toBe(id);
      expect(theme.label.length, id).toBeGreaterThan(2);
      expect(theme.background, id).toMatch(/gradient/);
      expect(["dark", "light"], id).toContain(theme.ink);
      expect(theme.scrim, id).toMatch(/gradient/);
    }
  });
});

describe("a theme costs bytes, not downloads", () => {
  // Comments stripped, like every other source scan in this repo: the prose
  // above the rule says "no url()" and would otherwise violate it.
  const source = readFileSync(join(process.cwd(), "lib", "hero", "themes.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, "");

  it("never references a raster asset", () => {
    // The whole reason personalisation lives in the background rather than in
    // the baby art: six themes are one bundle, six baby styles would be 42 × 6
    // files to precache on Paraguayan mobile data.
    expect(source).not.toMatch(/url\(/);
    expect(source).not.toMatch(/\.(png|jpe?g|webp|gif)\b/);
  });

  it("uses gradients only, so it renders before any network call", () => {
    for (const id of THEME_IDS) {
      expect(heroTheme(id).background, id).not.toMatch(/url\(/);
    }
  });
});

describe("the caption stays readable on every theme", () => {
  it("gives the one dark theme light ink", () => {
    // `estrellas` is a night sky. Dark text on it would be unreadable, and the
    // old hero hard-coded white text over a dark scrim — an assumption that
    // only held while there was a photograph underneath.
    expect(heroTheme("estrellas").ink).toBe("light");
    for (const id of THEME_IDS.filter((t) => t !== "estrellas")) {
      expect(heroTheme(id).ink, id).toBe("dark");
    }
  });

  it("returns concrete colours rather than class names", () => {
    // These land in inline styles over an arbitrary gradient, where a Tailwind
    // class would have to exist for every combination.
    for (const id of THEME_IDS) {
      const ink = themeInk(heroTheme(id));
      expect(ink.strong, id).toMatch(/^(#|rgba)/);
      expect(ink.soft, id).toMatch(/^(#|rgba)/);
      expect(ink.eyebrow, id).toMatch(/^(#|rgba)/);
    }
  });

  it("scrims every theme, so text never sits on bare gradient", () => {
    for (const id of THEME_IDS) {
      expect(heroTheme(id).scrim, id).toMatch(/rgba\(/);
    }
  });
});

describe("a stored preference is never trusted", () => {
  it("falls back to the default for anything unknown", () => {
    // The value comes off a synced Dexie row, so it can be a theme removed in
    // a later deploy, or a string from a much older client.
    for (const bad of ["", "nope", "__proto__", null, undefined, 7, {}]) {
      expect(asThemeId(bad)).toBe(DEFAULT_THEME);
    }
  });

  it("passes through every real id", () => {
    for (const id of THEME_IDS) expect(asThemeId(id)).toBe(id);
  });
});

// W3 — `docs/log/u7.md` "Known issues": contrast was checked by eye, not
// measured. The caption sits at the bottom of the card (`inset-x-5 bottom-5`
// in `WeekHeroImage`), where each theme's scrim gradient reaches its most
// opaque stop, so that is the pixel the caption's ink is actually read against.
describe("the caption meets WCAG AA against every theme's measured scrim", () => {
  const toRgb = (c: RGBA) => `rgb(${c.r}, ${c.g}, ${c.b})`;
  const lastStop = (gradient: string, colour: RegExp): string => {
    const stops = gradient.match(colour);
    const last = stops?.at(-1);
    if (!last) throw new Error(`no colour stop in "${gradient}"`);
    return last;
  };
  // The pixel under the caption: the scrim's bottom-most stop, composited
  // (it always carries alpha) over the background's own bottom-most stop.
  const scrimmedFloor = (theme: (typeof HERO_THEMES)[keyof typeof HERO_THEMES]) => {
    const bg = parseColor(lastStop(theme.background, /#[0-9a-fA-F]{3,6}/g));
    const scrim = parseColor(lastStop(theme.scrim, /rgba?\([^)]+\)/g));
    return compositeOver(scrim, bg);
  };
  // Ink colours can themselves carry alpha (`soft`); flatten against the
  // floor they are actually painted on before measuring the ratio.
  const ratio = (ink: string, floor: RGBA) =>
    contrastRatio(toRgb(compositeOver(parseColor(ink), floor)), toRgb(floor));

  for (const id of THEME_IDS) {
    it(`${id}: body ink ≥ 4.5:1, large ink ≥ 3:1`, () => {
      const theme = heroTheme(id);
      const floor = scrimmedFloor(theme);
      const ink = themeInk(theme);

      // Body-size text: the eyebrow line and the secondary "soft" lines.
      expect(ratio(ink.eyebrow, floor), `${id} eyebrow`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(ink.soft, floor), `${id} soft`).toBeGreaterThanOrEqual(4.5);
      // Large text: the "Semana N" headline (text-3xl, font-black).
      expect(ratio(ink.strong, floor), `${id} strong`).toBeGreaterThanOrEqual(3);
    });
  }
});

// With no render there is no scrim: the caption sits on the bare gradient, so
// it is measured against every colour stop the gradient passes through.
describe("the bare caption (no render) meets WCAG AA on its own theme", () => {
  const toRgb = (c: RGBA) => `rgb(${c.r}, ${c.g}, ${c.b})`;
  const ratio = (ink: string, floor: RGBA) =>
    contrastRatio(toRgb(compositeOver(parseColor(ink), floor)), toRgb(floor));

  for (const id of THEME_IDS) {
    it(`${id}: body ink ≥ 4.5:1 on every stop`, () => {
      const theme = heroTheme(id);
      const ink = bareInk(theme);
      for (const stop of theme.background.match(/#[0-9a-fA-F]{3,6}/g) ?? []) {
        const floor = parseColor(stop);
        expect(ratio(ink.eyebrow, floor), `${id} eyebrow on ${stop}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(ink.soft, floor), `${id} soft on ${stop}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(ink.strong, floor), `${id} strong on ${stop}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(fallbackInk(theme), floor), `${id} number on ${stop}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
