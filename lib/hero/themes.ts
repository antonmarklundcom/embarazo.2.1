// BUILD-PLAN C1/G3 · U7 — the background a woman chooses for her baby.
//
// HANDOFF-2026-09-06 §2: "a background-theme selector (soft golden halo,
// ñandutí lace medallion, sun/moon, stevia-leaf wreath, guardian-angel wings,
// starry sky), kept symbolic/abstract rather than depicting a specific
// religious figure, so they read as universal blessing/warmth to any user
// regardless of belief."
//
// **Zero raster assets, and that is the design.** Every theme is a CSS
// gradient plus inline SVG, so the six of them together cost bytes in a JS
// bundle rather than six downloads on Paraguayan mobile data — and they work
// on the first paint of an install that has never been online. This is also
// why personalisation lives here rather than in the baby art: one render per
// week is 42 files; one render per week per style would be 42 × 6, precached,
// for a decision taken once (§2 — the founder explicitly rejected multiple
// baby styles for exactly this reason).
//
// Each theme declares its own text tokens. The old hero hard-coded white text
// over a dark bottom gradient, which assumes a photograph underneath; a light
// lace medallion needs dark text and `estrellas` needs light, so "what colour
// is the caption" is a property of the theme rather than a constant.

export const THEME_IDS = [
  "halo",
  "nanduti",
  "cielo",
  "estevia",
  "alas",
  "estrellas",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** The theme a profile with no preference gets, and the SSR/first-paint value. */
export const DEFAULT_THEME: ThemeId = "halo";

export interface HeroTheme {
  id: ThemeId;
  /** es-PY, shown under the swatch in the sheet. */
  label: string;
  /** The CSS background for the card. Gradients only — no url(). */
  background: string;
  /**
   * `dark` = the theme is light, so text on it must be dark. `light` = the
   * theme is dark (only `estrellas`), so text must be light.
   */
  ink: "dark" | "light";
  /** The scrim under the caption block, tuned per theme rather than assumed. */
  scrim: string;
  /** Motif drawn over the gradient. `null` for the plain halo. */
  motif: MotifId | null;
}

export type MotifId = "nanduti" | "cielo" | "estevia" | "alas" | "estrellas";

/**
 * The six. Pinned by `lib/hero/themes.test.ts` — adding one is a decision
 * (a new theme is a new thing every existing user can switch to and a new
 * contrast pair to check), not a detail.
 *
 * Pastel tokens only, per the standing rules: these values are the
 * `--color-pastel-*` family from `app/globals.css` and the cream/sand pair,
 * never a saturated colour.
 */
export const HERO_THEMES: Record<ThemeId, HeroTheme> = {
  // The default, and deliberately the quietest: a warm glow behind the baby,
  // which is what the render's own lighting already does.
  halo: {
    id: "halo",
    label: "Halo dorado",
    background:
      "radial-gradient(120% 100% at 50% 38%, #FDF1DF 0%, #F8E2CB 45%, #EBCDAE 100%)",
    ink: "dark",
    scrim: "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.42) 100%)",
    motif: null,
  },
  // Ñandutí — Paraguay's lace, drawn as a radial medallion. The single most
  // Paraguayan thing this app can put behind a baby.
  nanduti: {
    id: "nanduti",
    label: "Ñandutí",
    background:
      "radial-gradient(120% 100% at 50% 40%, #FFFFFF 0%, #F3DAD4 55%, #E6C9C2 100%)",
    ink: "dark",
    scrim: "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.40) 100%)",
    motif: "nanduti",
  },
  cielo: {
    id: "cielo",
    label: "Sol y luna",
    background:
      "linear-gradient(180deg, #D9E5EC 0%, #EAF0F4 55%, #F8E2CB 100%)",
    ink: "dark",
    scrim: "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.38) 100%)",
    motif: "cielo",
  },
  estevia: {
    id: "estevia",
    label: "Ka'a he'ẽ",
    background:
      "radial-gradient(120% 100% at 50% 42%, #F2F7EE 0%, #DFE8D8 55%, #CBD9C1 100%)",
    ink: "dark",
    scrim: "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.40) 100%)",
    motif: "estevia",
  },
  // Wings as two abstract arcs. Not an angel, not a person — §2's rule is that
  // the symbol stays universal, so what is drawn is the shape of shelter and
  // nothing that could be somebody's deity or somebody else's.
  alas: {
    id: "alas",
    label: "Alas",
    background:
      "radial-gradient(120% 100% at 50% 40%, #F6F2FB 0%, #E6E0F0 55%, #D5CDE6 100%)",
    ink: "dark",
    scrim: "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.40) 100%)",
    motif: "alas",
  },
  // The one dark theme, so the one where the caption goes light.
  estrellas: {
    id: "estrellas",
    label: "Noche estrellada",
    background:
      "radial-gradient(120% 100% at 50% 30%, #4A5A70 0%, #37455A 50%, #232C3B 100%)",
    ink: "light",
    scrim: "linear-gradient(180deg, rgba(20,24,32,0) 35%, rgba(20,24,32,0.62) 100%)",
    motif: "estrellas",
  },
};

/** Narrow an untrusted value — a stored preference, a URL — to a theme. */
export function asThemeId(value: unknown): ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value)
    ? (value as ThemeId)
    : DEFAULT_THEME;
}

export function heroTheme(id: ThemeId): HeroTheme {
  return HERO_THEMES[id];
}

/** Text colours for a theme, as concrete values rather than class names. */
export function themeInk(theme: HeroTheme): {
  strong: string;
  soft: string;
  eyebrow: string;
} {
  return theme.ink === "light"
    ? { strong: "#FFFFFF", soft: "rgba(255,255,255,0.82)", eyebrow: "#FBE9D8" }
    : { strong: "#FFFFFF", soft: "rgba(255,255,255,0.88)", eyebrow: "#FBE9D8" };
}
