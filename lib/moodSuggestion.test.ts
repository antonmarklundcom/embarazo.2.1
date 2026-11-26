import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { moodSuggestion } from "./moodSuggestion";
import { MOODS } from "./mood";

describe("the suggestion under the mood check-in", () => {
  it("gives a low mood nothing, so the support card stands alone", () => {
    expect(moodSuggestion("mal")).toBeNull();
    expect(moodSuggestion("muy_mal")).toBeNull();
    expect(moodSuggestion("muy_mal", { afterBirth: true })).toBeNull();
  });

  it("gives nothing before she has recorded a mood", () => {
    expect(moodSuggestion(undefined)).toBeNull();
  });

  it("maps the other moods to one screen each", () => {
    expect(moodSuggestion("regular")?.href).toBe("/herramientas/diario");
    expect(moodSuggestion("bien")?.href).toBe("/herramientas/diario");
    expect(moodSuggestion("muy_bien")?.href).toBe("/herramientas/fotos");
    // The photo screen is the bump diary; after the birth, the diary instead.
    expect(moodSuggestion("muy_bien", { afterBirth: true })?.href).toBe("/herramientas/diario");
  });

  it("links only to screens that exist", () => {
    for (const mood of MOODS) {
      for (const afterBirth of [false, true]) {
        const suggestion = moodSuggestion(mood.key, { afterBirth });
        if (!suggestion) continue;
        const page = join(process.cwd(), "app", "(app)", ...suggestion.href.split("/").filter(Boolean), "page.tsx");
        expect(existsSync(page), suggestion.href).toBe(true);
      }
    }
  });

  it("says one neutral question, no advice and no reading of her mood", () => {
    const lines = new Set(
      MOODS.flatMap((mood) => [moodSuggestion(mood.key), moodSuggestion(mood.key, { afterBirth: true })])
        .filter((s) => s !== null)
        .map((s) => s.text),
    );
    for (const line of lines) {
      expect(line).toMatch(/^¿Querés .+\?$/);
      expect(line.length).toBeLessThanOrEqual(50);
      expect(line.toLowerCase()).not.toMatch(/deberías|tenés que|normal|cansad|triste|médic|salud|dorm/);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
