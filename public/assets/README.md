# App images

The app loads images from here **by convention** and shows a styled
fallback whenever a file is missing — so you can add images incrementally
without touching code.

## Where each image goes

| Folder | File name | Used by |
|---|---|---|
| `semanas/` | `bebe-<week>.webp` (e.g. `bebe-21.webp`, weeks 4–42) | Home hero + `/semana/<week>` hero — the "Tu bebé a las N semanas" render |
| `articulos/` | `<article-slug>.webp` | Guía / article cards |
| `hero/` | `<name>.webp` | Lifestyle photos on Home / landing |

`_src/` is for **originals** you drop in before optimizing — it is not
served and can hold big PNG/JPG files.

## How to add images

1. Drop your source images anywhere under `public/assets/_src/`, mirroring
   the target folder (e.g. `_src/semanas/bebe-21.png`).
2. Install the optimizer once: `npm i -D sharp`
3. Run: `node scripts/optimize-images.mjs`
   → writes resized WebP (≤800px, ≤~60 KB) to the matching folder.
4. Commit the `.webp` files. (You can leave `_src/` uncommitted.)

For a handful of images you can also just upload finished `.webp` files
straight into the right folder via the GitHub web UI.

## Rules
- Web-ready target: **WebP, ≤800px, ≤60 KB** each (the script enforces this).
- Only AI-generated or founder-owned art — no scraped stock.
