import { DIRECTORY_CATEGORIES } from "./directoryCategories";
import type { DirectoryCategory, DirectoryListing } from "./types";

// BUILD-PLAN D5 — directory category banners (feature map #26), pure half.
//
// Two rules, both about not lying to the user:
//
//   1. A category with no listings **does not get a banner**. "Bancos de cordón
//      · 0 lugares" is a promise the app cannot keep, and Z1's whole point is
//      that a warm honest empty state beats a grid of zeros.
//   2. The count is the count of what the user would actually see if she
//      tapped it — after the department and the search box, not before. A
//      banner saying "24 lugares" that opens onto three is worse than no
//      number at all.

/** How many listings to render per category before "ver más" (D5). */
export const LISTINGS_PER_PAGE = 10;

export interface CategoryBanner {
  key: DirectoryCategory;
  /** "Sanatorios", "Bancos de cordón" — the plural, because it is a heading. */
  title: string;
  count: number;
  /** Pastel token; cycles through the palette in canonical category order. */
  tone: string;
  /** Where the photograph goes when the founder has one (G4). */
  image: string;
}

const TONES = [
  "bg-pastel-rosa",
  "bg-pastel-celeste",
  "bg-pastel-salvia",
  "bg-pastel-lavanda",
  "bg-pastel-arena",
];

/**
 * One banner per category that has something in it, in canonical order.
 *
 * Takes the already-filtered listings, so the caller's department and search
 * are applied by construction rather than re-implemented here.
 */
export function categoryBanners(
  listings: readonly DirectoryListing[],
): CategoryBanner[] {
  const counts = new Map<DirectoryCategory, number>();
  for (const listing of listings) {
    counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
  }

  return DIRECTORY_CATEGORIES.filter((category) => counts.has(category.key)).map(
    (category, index) => ({
      key: category.key,
      title: category.plural,
      count: counts.get(category.key)!,
      tone: TONES[index % TONES.length]!,
      image: `/assets/directorio/${category.key}.webp`,
    }),
  );
}

/** "24 lugares" / "1 lugar" — the label under the banner title. */
export function placesLabel(count: number): string {
  return count === 1 ? "1 lugar" : `${count} lugares`;
}
