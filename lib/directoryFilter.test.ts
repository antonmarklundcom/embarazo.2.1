import { describe, expect, it } from "vitest";

import {
  filterDirectory,
  filterPlacements,
  matchesTrimester,
} from "./directoryFilter";
import type { AdPlacement, DirectoryListing } from "./types";

// BUILD-PLAN J3. Moving a filter off the server is only a privacy win if the
// filter still works, so the rules that used to live in the route handlers are
// tested here now that they live on the device.

function placement(over: Partial<AdPlacement> = {}): AdPlacement {
  return {
    id: "p1",
    sponsorName: "Sanatorio",
    headline: "Control prenatal",
    body: "Turnos disponibles",
    ctaLabel: "Consultar",
    whatsappNumber: "+595981000001",
    trimester: 1,
    department: "capital",
    priority: 1,
    ...over,
  } as AdPlacement;
}

function listing(over: Partial<DirectoryListing> = {}): DirectoryListing {
  return {
    id: "l1",
    name: "Sanatorio Central",
    category: "sanatorio",
    department: "capital",
    city: "Asunción",
    whatsappNumber: "+595981000001",
    isSponsored: false,
    priority: 1,
    ...over,
  } as DirectoryListing;
}

describe("matchesTrimester", () => {
  it("treats trimester 0 as 'all trimesters'", () => {
    // This convention predates J3 and is why the check cannot be equality.
    expect(matchesTrimester(placement({ trimester: 0 }), 1)).toBe(true);
    expect(matchesTrimester(placement({ trimester: 0 }), 3)).toBe(true);
  });

  it("matches an exact trimester", () => {
    expect(matchesTrimester(placement({ trimester: 2 }), 2)).toBe(true);
    expect(matchesTrimester(placement({ trimester: 2 }), 3)).toBe(false);
  });

  it("keeps everything when the trimester is unknown", () => {
    // A profile with no due date yet must still see the directory.
    expect(matchesTrimester(placement({ trimester: 2 }), undefined)).toBe(true);
  });
});

describe("filterPlacements", () => {
  it("keeps the matching and the all-trimester ones", () => {
    const result = filterPlacements(
      [
        placement({ id: "a", trimester: 1 }),
        placement({ id: "b", trimester: 2 }),
        placement({ id: "c", trimester: 0 }),
      ],
      2,
    );
    expect(result.map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("filterDirectory", () => {
  const listings = [
    listing({ id: "a", department: "capital", category: "sanatorio", name: "Sanatorio Central" }),
    listing({ id: "b", department: "central", category: "sanatorio", name: "Sanatorio Luque", city: "Luque" }),
    listing({ id: "c", department: "capital", category: "obstetra", name: "Dra. Giménez" }),
  ];

  it("filters by department", () => {
    expect(
      filterDirectory(listings, { department: "central" }).map((l) => l.id),
    ).toEqual(["b"]);
  });

  it("filters by category", () => {
    expect(
      filterDirectory(listings, { category: "obstetra" }).map((l) => l.id),
    ).toEqual(["c"]);
  });

  it("treats 'todos' as no category filter", () => {
    expect(filterDirectory(listings, { category: "todos" })).toHaveLength(3);
  });

  it("searches name and city, case-insensitively", () => {
    expect(filterDirectory(listings, { q: "luque" }).map((l) => l.id)).toEqual([
      "b",
    ]);
    expect(filterDirectory(listings, { q: "GIMÉNEZ" }).map((l) => l.id)).toEqual(
      ["c"],
    );
  });

  it("ignores a blank or whitespace-only search", () => {
    expect(filterDirectory(listings, { q: "   " })).toHaveLength(3);
  });

  it("combines filters", () => {
    expect(
      filterDirectory(listings, {
        department: "capital",
        category: "sanatorio",
        q: "central",
      }).map((l) => l.id),
    ).toEqual(["a"]);
  });

  it("returns nothing rather than everything when nothing matches", () => {
    expect(filterDirectory(listings, { q: "no existe" })).toEqual([]);
  });
});
