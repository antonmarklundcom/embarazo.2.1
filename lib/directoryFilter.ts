// BUILD-PLAN J3 — the filtering that used to happen on the server.
//
// Pure and unit-tested, because moving a filter to the client is only a
// privacy win if the filter still works. These are the exact rules the
// `/api/v1/directory` and `/api/v1/placements` routes applied before J3 took
// their query parameters away; the routes now return everything and the
// device decides what it wants to see, so nothing about where the user is or
// how pregnant they are is transmitted.

import type { AdPlacement, DirectoryListing, Trimester } from "./types";

/**
 * A placement's `trimester: 0` means "all trimesters" and always matches.
 * That convention predates J3 and is why this cannot be a plain equality
 * check (DECISIONS.md, "API routes").
 */
export function matchesTrimester(
  placement: Pick<AdPlacement, "trimester">,
  trimester: Trimester | undefined,
): boolean {
  if (placement.trimester === 0) return true;
  if (trimester === undefined) return true;
  return placement.trimester === trimester;
}

export function filterPlacements(
  placements: AdPlacement[],
  trimester: Trimester | undefined,
): AdPlacement[] {
  return placements.filter((p) => matchesTrimester(p, trimester));
}

export interface DirectoryFilter {
  department?: string;
  category?: string;
  /** Free text, matched against name and city — same as the old `q` param. */
  q?: string;
}

export function filterDirectory(
  listings: DirectoryListing[],
  filter: DirectoryFilter,
): DirectoryListing[] {
  const needle = filter.q?.trim().toLowerCase();

  return listings.filter((listing) => {
    if (filter.department && listing.department !== filter.department) {
      return false;
    }
    if (
      filter.category &&
      filter.category !== "todos" &&
      listing.category !== filter.category
    ) {
      return false;
    }
    if (needle) {
      const haystack = `${listing.name} ${listing.city}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
