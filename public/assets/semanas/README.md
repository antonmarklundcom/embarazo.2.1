# Week renders and comparison objects
## Current workflow — 16 October 2026

The approved weekly set now uses restrained realistic 3D medical-style renders
on opaque cream studio backgrounds. The historical transparency mandate below
is superseded for this set. `WEEK_ART_STYLE = "cutout"` remains a compatibility
value for the existing layout and week availability; it no longer promises alpha.
Weeks 1–2 still have no embryo image. Images are illustrative and do not replace
or modify the app's clinical measurements, dates or comparison captions.

Generation originals, briefs and QA stay outside Git under
`E:/ai work/Artifacts/embarazo.2.1/2026-10-16/design`. See
[`docs/DESIGN-IMAGERY-2026-10-16.md`](../../../docs/DESIGN-IMAGERY-2026-10-16.md)
and [`docs/imagery-manifest.json`](../../../docs/imagery-manifest.json) for the
current handoff and provenance. Do not commit raw originals or private references.
Use the approved webimg pipeline for local AVIF/WebP variants and inspect crops
before placement. The canonical weekly WebP fallback is 640 pixels square.

Runtime aliases in `lib/realistic-image-slots.json` resolve through
`lib/realisticImages.ts` and `lib/editorialImages.ts` to
`public/assets/img/manifest.json`. `RealisticPicture` emits responsive AVIF/WebP
sources and preserves the original canonical URL when a mapped manifest entry
is absent. Weekly callers pass `weekArtSrc(week)`, including its revision query;
lookup strips the query only to find the alias. Keep canonical paths
`/assets/semanas/bebe-3.webp` through `bebe-42.webp` as compatibility fallbacks.
When replacing those bytes, advance `WEEK_ART_REVISION` in `lib/hero/weekArt.ts`,
retain existing cache names, and verify installed online-to-offline behavior.

The home ring keeps its circular clip; the week detail view gives the cream
background rounded tile corners over the selected theme. Load/error probes,
drawn fallbacks and theme preferences remain intact.

## Historical cutout workflow (superseded for the current set)

**Today (2026-09-28):** this directory holds the transparent **cutout** renders
`bebe-3.webp` … `bebe-42.webp` (`npm run localize:images` from
`docs/imagery-manifest.json`; weeks 16, 18, 26 and 28–42 regenerated that day with
week 22 as the style reference). `lib/hero/weekArt.ts` sets `WEEK_ART_STYLE = "cutout"`.
The baby is the same character every week; the **size** is the comparison object in
`../comparaciones/` (a Paraguayan fruit or vegetable), drawn to scale beside the baby
on `/semana/<n>` and as a badge on the Hoy ring. Weeks 1–2 have no render.

Everything below describes the cutout set
(transparent renders, weeks 3–42). Moving to it: localize the renders
(`npm run localize:images`, after the founder approves them), then flip
`WEEK_ART_STYLE` to `"cutout"`.

The app still looks finished with no file at all (`components/WeekHeroImage.tsx`
falls back to the week number and a drawing on the chosen theme).

Written for U10 and for the founder running generation locally.

## What goes where

| What | Source (transparent PNG) | Output (committed) |
|---|---|---|
| Week render | `public/assets/semanas/src/bebe-<week>.png` | `public/assets/semanas/bebe-<week>.webp` |
| Comparison object | `public/assets/comparaciones/src/<slug>.png` | `public/assets/comparaciones/<slug>.webp` |

`<week>` is 3–42. Weeks 1 and 2 have no render and never will — there is no
embryo yet, and the hero says so.

`<slug>` comes from `lib/seed/comparisons.json`'s `imageSrc`, which is the
authority. Run `node -e "console.log(require('./lib/seed/comparisons.json').map(r=>r.imageSrc).join('\n'))"`
for the exact list; there are **38 objects for 40 weeks** (weeks 40 and 41 share
"una sandía grande y madura"; one file serves both). Since 2026-10-07 the drawn
object never shrinks from one week to the next (`lib/seed/comparisons.test.ts`);
seven older objects are retired in `docs/imagery-manifest.json` but kept on disk.

## How to convert

```
npm i -D sharp          # one time
npm run optimize:images public/assets/semanas/src
npm run optimize:images public/assets/comparaciones/src
```

The script strips the `src/` segment, resizes to 800 px, and encodes WebP under
a 60 KB budget. Commit the `.webp` files; the `src/` PNGs stay out of the repo.

## The one requirement that is not negotiable

**Transparent background.** Both the renders and the objects are composited
over a background theme the user chooses (`lib/hero/themes.ts` — halo, ñandutí,
sun/moon, stevia, wings, night sky). A render exported on white will show as a
white rectangle sitting on top of her ñandutí, which looks broken rather than
missing — worse than the empty state this directory is in today.

Generate on a **flat solid background** (not a gradient) so `rembg` can cut it
cleanly, then check the conversion log: `optimize-images` prints
`⚠ sin transparencia` next to any file whose alpha channel did not survive.

## Style

`docs/HANDOFF-2026-09-06.md` §2 is the brief, and it is one style for all 42
weeks: semi-realistic soft-glow 3D render, warm golden lighting, anatomically
recognisable but idealised, **side-curled with legs drawn up at every week** so
no genitalia are shown. The comparison objects are Paraguayan produce and are
lit the same way, so the two read as one family rather than as a baby next to a
stock photo.

Sizing is handled in code, not in the art: `lib/hero/scale.ts` scales both
subjects from `lengthCm` and `itemCm`, so the objects do **not** need to be
drawn at relative scale to each other. Render each one filling its own frame.
