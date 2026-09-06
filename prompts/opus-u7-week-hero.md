# Unit U7 — week hero v2: background themes, fruit toggle, relative scale. OPUS session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §1(5), §2–§4, §7–§8, `docs/HANDOFF-2026-09-06.md` §2
("Image style" + "Planned UI"), BUILD-PLAN.md C1 + C3 + B1 + B2 + G3, `docs/REDESIGN-PLAN.md` §4,
`components/WeekHeroImage.tsx`, `components/SizeTabs.tsx`, `lib/weeks.ts` (top 80 lines + `sizeComparison` values),
`lib/seed/limbSizes.*` (seed + schema pattern), `lib/i18n/useLocale.ts` (how a preference lives on `profile`),
`app/sw.ts` (the `mibebe-semanas` rule), `scripts/optimize-images.mjs`, `app/(app)/page.tsx` and
`app/(app)/semana/[n]/page.tsx` (only where the hero is mounted). Execute under the autonomy protocol (§4).

Owns: `components/WeekHeroImage.tsx` · `components/hero/**` (theme sheet, comparison figure) · `lib/hero/**`
(themes, scale, preference) · `lib/seed/comparisons.json` + `.ts` + `.test.ts` · `lib/content/schemas.ts` (append one
block) · `scripts/validate-content.mts` (register) · `lib/db.ts` (two optional non-indexed fields on `Profile`, no
version bump) · `app/sw.ts` (widen the one CacheFirst rule to `/assets/comparaciones/`) · `scripts/optimize-images.mjs`
(alpha-preserving WebP) · `app/(app)/page.tsx` + `app/(app)/semana/[n]/page.tsx` (prop plumbing only) ·
`public/assets/semanas/README.md` · `e2e/week-hero.spec.ts` · `docs/log/u7.md`.

Build:
- **Themes** (`lib/hero/themes.ts`, pinned by a test): `halo` (soft golden, default), `nanduti` (lace medallion as
  inline SVG), `cielo` (sun/moon), `estevia` (leaf wreath), `alas` (abstract wing shapes), `estrellas` (night sky).
  CSS gradients + inline SVG only — zero raster assets, so a theme costs bytes, not downloads. Each theme declares its
  text/overlay tokens (the current dark bottom gradient assumes a photo; light themes need dark text, `estrellas`
  needs light). Symbolic, never a depicted religious figure. Pastel tokens only.
- **Preferences** on the Dexie `profile` row: `heroTheme?: ThemeId`, `showComparison?: boolean` (default true).
  Same pattern as `locale`: `useLiveQuery`, synced for free, SSR/first paint = defaults, no flash of `undefined`.
  Selector = a small chip on the hero card opening a bottom sheet with the six swatches + the fruit toggle. Nothing
  in `/ajustes` (U11 may add a row).
- **Comparisons** `lib/seed/comparisons.json`: per week 3–42 `{ week, itemCm, imageSrc }`; the label stays
  `lib/weeks.ts`' `sizeComparison` (one source for the words; a test asserts every week 3–42 has a row and the
  item names in the README match). `itemCm` is the item's longest dimension, approximate, sourced by you.
- **Scale engine** `lib/hero/scale.ts`, pure and unit-tested: given `lengthCm` (baby) and `itemCm`, a box height and a
  legibility floor, return both render heights so the *larger* fills the box and the smaller is proportional — with a
  floor: below the floor, clamp and add the caption "tamaño real ≈ 0,1 cm" so a poppy seed is visible AND honest.
  Note the crown-rump → crown-heel switch at week 20 in `lib/weeks.ts`; do not smooth it, caption it.
- **Image composition**: `bebe-<week>.webp` with alpha over the theme; `fetchPriority="high"` on the home hero (it
  is the LCP element); current fallback (week number on theme) when the file 404s; weeks 1–2 render theme + text
  with no subject. Hero alt/caption keep using `babyAtWeekLabel` (B1/B2). `optimize:images` must emit alpha WebP from
  the founder's transparent PNGs in `public/assets/semanas/src/` and `public/assets/comparaciones/src/`; write the
  README with the exact input/output paths and filenames for U10 and the founder.
- Backlog note (do not build): the E2 share card keeps its flat card; themed hero on the share card is a later unit.
- Tests: themes pinned, scale engine edges (equal sizes, 1000:1 ratio, missing item), comparisons coverage,
  e2e: change theme → repaint without reload → persists after reload; fruit toggle hides the figure; `/semana/24`
  renders the same theme as home.

Exit: gates green (§4.3); with **no** renders present the home hero and `/semana/[n]` look finished on every theme
(that is production today); with one test render dropped in, it composites with alpha at proportional scale.
Home LCP not worse than before on a local Lighthouse run. Open the PR that turn; write `docs/log/u7.md`. Spawn nothing.
