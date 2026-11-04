import type { Metadata } from "next";
import { APP_NAME } from "../brand";
import { getWeek, sizeLine } from "../weeks";
import { hasWeekArt } from "../hero/weekArt";

// Item 7 — per-page Open Graph / Twitter metadata.
//
// Next merges metadata shallowly: a page's `openGraph` replaces the root
// layout's wholesale, so every field the card needs (type, siteName, locale,
// images) is set here again rather than inherited.

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** The root layout's card, for pages without an image of their own. */
export const DEFAULT_OG_IMAGE = { url: "/og.png", ...OG_IMAGE_SIZE, alt: APP_NAME } as const;

export interface PageCard {
  title: string;
  description: string;
  /** Absolute, or app-relative (resolved against the root `metadataBase`). */
  url: string;
  /**
   * Omit to let a file-convention `opengraph-image` fill it: an explicit
   * `images` here would win over the file (Next only applies the file when
   * the segment's own metadata has no `images`).
   */
  images?: ReadonlyArray<{ url: string; width: number; height: number; alt: string }>;
}

export function pageSocialMetadata(card: PageCard): Pick<Metadata, "openGraph" | "twitter"> {
  const images = card.images?.map((image) => ({ ...image }));
  return {
    openGraph: {
      type: "article",
      siteName: APP_NAME,
      locale: "es_PY",
      title: card.title,
      description: card.description,
      url: card.url,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: card.title,
      description: card.description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}

/** What the week's share card says, and which render (if any) it shows. */
export function weekCardContent(week: number): {
  heading: string;
  size: string;
  artPath: string | null;
} {
  const info = getWeek(week);
  return {
    heading: `Semana ${week}`,
    size: sizeLine(info.sizeComparison),
    artPath: hasWeekArt(week) ? `public/assets/semanas/bebe-${week}.webp` : null,
  };
}
