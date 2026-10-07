import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { WEEK_ART_STYLE, hasWeekArt, weekArtAlt, weekArtSrc } from "./weekArt";

// Item 7 of the growth plan: the site's week illustrations in the app hero.
// The switch and the files on disk have to agree, or the hero asks for a 404
// (the fallback hides it, so nothing else would notice).

describe("week art", () => {
  it("N6: every URL carries the art revision, so a replaced render is a new cache key", () => {
    expect(weekArtSrc(20)).toMatch(/^\/assets\/semanas\/bebe-20\.webp\?v=\d{4}-\d{2}-\d{2}$/);
  });

  it("has a file on disk for every week the switch claims", () => {
    for (let week = 1; week <= 42; week++) {
      if (!hasWeekArt(week)) continue;
      const file = join(process.cwd(), "public", weekArtSrc(week).split("?")[0]!);
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("never claims a week outside 1–42", () => {
    expect(hasWeekArt(0)).toBe(false);
    expect(hasWeekArt(43)).toBe(false);
    expect(hasWeekArt(2.5)).toBe(false);
  });

  it("describes the picture, not the baby, while the framed set is on disk", () => {
    if (WEEK_ART_STYLE !== "framed") return;
    expect(weekArtAlt(20)).toBe("El tamaño de tu bebé en la semana 20: una banana.");
    // Weeks 1–2 are calendars: there is no size to name.
    expect(weekArtAlt(1)).toBe("Un calendario: en la semana 1 todavía no hay embrión.");
    expect(weekArtAlt(42)).toMatch(/^El tamaño de tu bebé en la semana 42: /);
  });
});
