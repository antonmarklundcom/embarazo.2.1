import { getWeek, hasSizeComparison } from "@/lib/weeks";

// Canonical weekly paths remain stable for publication and offline fallbacks.
// Current art (2026-10-16) is stage-specific realistic 3D illustration on a
// cream studio background, with responsive AVIF/WebP aliases selected by
// RealisticPicture. Provenance remains in docs/imagery-manifest.json.
//
// The "cutout" enum value is retained for the established baby/comparison
// layout and week availability; it no longer promises a transparent image or
// the same anatomy every week. WeekBabyFigure uses a rounded tile and the home
// hero clips a circle. Theme preferences and clinical measurements are separate.
//
// The historical "framed" branch remains compatible with the site's opaque
// fruit/calendar set imported by scripts/import-site-week-art.mjs. It includes
// calendars for weeks 1–2; the current baby set starts at week 3.
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
export const WEEK_ART_REVISION = "2026-10-16-realistic";

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
