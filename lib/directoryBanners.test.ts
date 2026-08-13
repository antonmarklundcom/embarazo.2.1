import { describe, expect, it } from "vitest";

import { categoryBanners, placesLabel } from "./directoryBanners";
import { DIRECTORY_CATEGORIES } from "./directoryCategories";
import type { DirectoryListing } from "./types";

// BUILD-PLAN D5. The rule worth testing is the one about not lying: a category
// with nothing in it gets no banner, and the number on a banner is the number
// of things behind it.

function listing(
  id: string,
  category: DirectoryListing["category"],
): DirectoryListing {
  return {
    id,
    name: id,
    category,
    department: "capital",
    city: "Asunción",
    whatsappNumber: "+595981234567",
    isSponsored: false,
    priority: 0,
  };
}

describe("categoryBanners", () => {
  it("shows nothing when there is nothing", () => {
    // The state the app ships in today: every listing is gated (Z1), so the
    // grid must be absent rather than nine banners reading "0 lugares".
    expect(categoryBanners([])).toEqual([]);
  });

  it("only banners categories that have listings", () => {
    const banners = categoryBanners([
      listing("a", "sanatorio"),
      listing("b", "sanatorio"),
      listing("c", "farmacia"),
    ]);
    expect(banners.map((banner) => banner.key)).toEqual(["sanatorio", "farmacia"]);
  });

  it("counts what is behind the banner", () => {
    const banners = categoryBanners([
      listing("a", "sanatorio"),
      listing("b", "sanatorio"),
      listing("c", "farmacia"),
    ]);
    expect(banners[0]!.count).toBe(2);
    expect(banners[1]!.count).toBe(1);
  });

  it("keeps the canonical category order", () => {
    // Farmacias last, sanatorios first, whatever order the data arrived in.
    const banners = categoryBanners([
      listing("c", "farmacia"),
      listing("a", "sanatorio"),
    ]);
    expect(banners.map((b) => b.key)).toEqual(["sanatorio", "farmacia"]);
  });

  it("titles a banner with the plural, because it is a heading", () => {
    const banners = categoryBanners([listing("a", "cordon")]);
    expect(banners[0]!.title).toBe("Bancos de cordón");
  });

  it("points at an image path per category, for when photography lands", () => {
    for (const category of DIRECTORY_CATEGORIES) {
      const [banner] = categoryBanners([listing("x", category.key)]);
      expect(banner!.image).toBe(`/assets/directorio/${category.key}.webp`);
    }
  });
});

describe("placesLabel", () => {
  it("counts in Spanish", () => {
    expect(placesLabel(1)).toBe("1 lugar");
    expect(placesLabel(24)).toBe("24 lugares");
  });
});
