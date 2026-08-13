import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLISHED_OBSTETRA_NOTES, obstetraNote } from "./obstetraNotes";
import { ObstetraNoteSchema } from "../content/schemas";
import { isPlaceholderReviewer } from "../launchChecks";

// BUILD-PLAN C5. The content tests are ordinary; the one that matters is the
// last block, which asserts that this card cannot render without a named
// reviewer. That is the whole feature — an unsigned "de la obstetra" card is
// the app claiming authority it does not have, on prenatal advice.

describe("the notes", () => {
  it("covers every week, once each", () => {
    const weeks = PUBLISHED_OBSTETRA_NOTES.map((entry) => entry.week);
    expect(weeks).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it("says something different every week", () => {
    const notes = PUBLISHED_OBSTETRA_NOTES.map((entry) => entry.note);
    expect(new Set(notes).size).toBe(notes.length);
  });

  it("returns null outside the pregnancy", () => {
    expect(obstetraNote(0)).toBeNull();
    expect(obstetraNote(43)).toBeNull();
  });

  it("puts the Paraguayan prenatal calendar where it belongs", () => {
    // These are the fixed windows a translated global app gets wrong, and the
    // reason this content is worth writing at all. Each is asserted at the week
    // a user would look it up.
    expect(obstetraNote(11)).toContain("translucencia nucal");
    expect(obstetraNote(18)).toContain("morfológica");
    expect(obstetraNote(24)).toContain("glucosa");
    expect(obstetraNote(27)).toContain("dTpa");
    expect(obstetraNote(35)).toContain("estreptococo");
    expect(obstetraNote(13)).toContain("carné perinatal");
  });

  it("names the alarm signs at the weeks they matter", () => {
    expect(obstetraNote(26)!.toLowerCase()).toContain("preeclampsia");
    expect(obstetraNote(30)!.toLowerCase()).toContain("movimientos");
    expect(obstetraNote(37)!.toLowerCase()).toContain("contracciones");
  });

  it("keeps a note to something readable on a phone", () => {
    for (const entry of PUBLISHED_OBSTETRA_NOTES) {
      expect(
        ObstetraNoteSchema.safeParse(entry).success,
        `semana ${entry.week}`,
      ).toBe(true);
    }
  });
});

describe("the byline is the gate", () => {
  it("treats an unset or placeholder reviewer as no reviewer", () => {
    // The same helper the card branches on, and the same one Z2's build check
    // uses — one definition of "there is no reviewer", not two.
    expect(isPlaceholderReviewer(undefined)).toBe(true);
    expect(isPlaceholderReviewer("")).toBe(true);
    expect(isPlaceholderReviewer("Dra. ___, gineco-obstetra")).toBe(true);
    expect(isPlaceholderReviewer("Dra. Ana Giménez, gineco-obstetra")).toBe(false);
  });

  it("has no fallback byline anywhere in the card", () => {
    // Z2 removed exactly this from `MedicalReviewByline`: a generic "el equipo
    // médico de Mi Bebé" is a claim that review happened. Asserted against the
    // source, because the failure is something a future edit *adds*.
    const source = readFileSync(
      join(process.cwd(), "components", "ObstetraCard.tsx"),
      "utf8",
    );
    expect(source).toContain("isPlaceholderReviewer");
    // Comments stripped first, so the comment *explaining* this rule does not
    // trip it — only code counts.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code.toLowerCase()).not.toContain("equipo médico");
    // No literal author string: the byline can only come from the env var.
    expect(code).not.toMatch(/"Dra?\.|"Lic\./);
  });
});
