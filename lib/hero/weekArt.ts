import { getWeek, hasSizeComparison } from "@/lib/weeks";

// What sits at `/assets/semanas/bebe-<week>.webp` today, and how to show it.
//
// Two kinds of art can live behind that one filename contract:
//
// - "framed": the site's 42 size illustrations (embarazo.com.py, copied by
//   `scripts/import-site-week-art.mjs`). Square, OPAQUE (a flat pastel ground
//   is part of each picture), and a fruit or a calendar rather than the baby.
//   Composited over a theme they would read as a coloured square pasted on
//   her ñandutí, so they are shown as a framed picture in the card instead.
// - "cutout": the transparent baby renders `docs/imagery-manifest.json`
//   describes (weeks 3–42), composited over the theme — the layout U7 built.
//
// Swapping in the cutouts is `npm run localize:images` plus flipping this one
// constant; no other file needs to know which set is on disk.
//
// 2026-09-28: the cutouts are on disk (weeks 16, 18, 26 and 28–42 regenerated
// that day, see the manifest). The week's SIZE is told by the comparison
// object beside the baby (`public/assets/comparaciones/`), not by the baby
// drawing, which is the same character every week.
export const WEEK_ART_STYLE: "framed" | "cutout" = "cutout";

/** Weeks that have a file. The site set covers 1–42 (1–2 are calendars). */
export function hasWeekArt(week: number): boolean {
  const first = WEEK_ART_STYLE === "framed" ? 1 : 3;
  return Number.isInteger(week) && week >= first && week <= 42;
}

/**
 * N6 — bump whenever the files behind `bebe-<week>.webp` change.
 *
 * The service worker serves these CacheFirst (`mibebe-semanas`, app/sw.ts) and
 * never revalidates, so the same URL meant the same bytes forever: when the 42
 * renders were replaced on 2026-09-28, a phone that had cached the previous
 * set kept showing it (under the cutout layout). A new revision is a new cache
 * key; the cache name itself stays, as AGENTS.md requires.
 */
export const WEEK_ART_REVISION = "2026-09-28";

export function weekArtSrc(week: number): string {
  return `/assets/semanas/bebe-${week}.webp?v=${WEEK_ART_REVISION}`;
}

/**
 * Alt text for the framed set: what the picture shows, in the site's own
 * sentence, so a screen reader is not told "tu bebé" over a banana. `null`
 * for the cutout set, where the caller's baby label is the right description.
 */
export function weekArtAlt(week: number): string | null {
  if (WEEK_ART_STYLE !== "framed" || !hasWeekArt(week)) return null;
  const { sizeComparison } = getWeek(week);
  if (!hasSizeComparison(sizeComparison)) {
    return `Un calendario: en la semana ${week} todavía no hay embrión.`;
  }
  return `El tamaño de tu bebé en la semana ${week}: ${sizeComparison}.`;
}
