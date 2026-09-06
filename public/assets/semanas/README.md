# Week renders and comparison objects

This directory is **empty on purpose**. The app is built to look finished
without it (`components/WeekHeroImage.tsx` falls back to the week number on the
chosen theme), and it starts looking better the day the first file lands — no
code change, no deploy flag.

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
for the exact list; there are **28 objects for 40 weeks**, because "una sandía"
serves several weeks and one file serves them all.

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
