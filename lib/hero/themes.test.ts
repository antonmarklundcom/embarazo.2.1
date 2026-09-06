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
} from "./themes";

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
