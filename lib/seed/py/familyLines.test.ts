import { describe, expect, it } from "vitest";

import { FAMILY_LINES_LANG, PUBLISHED_FAMILY_LINES, familyLine } from "./familyLines";
import { FamilyLineSchema } from "../../content/schemas";
import { MAX_WEEK, MIN_WEEK } from "../../pregnancy";

// The family's line is practical and emotional support only. This list is the
// teeth of that rule: any line touching health (symptoms, food rules,
// medicines, home remedies, exercise, weight, risk, what is normal, hospital,
// the baby's development, breastfeeding, controls and vaccines dates) fails.
//
// Matched as lowercase substrings. Stems are used where Spanish inflects
// ("sangr" catches sangre/sangrado, "vacun" catches vacuna/vacunas).
// Dropped on purpose, because they blocked innocent lines without catching
// anything the other terms miss:
//   - "té": a substring of "esté", "esperté", etc.
//   - "control" / "consulta": going with her to the control is an allowed
//     kind of help. Dates of controls are kept out by "semanas de" and
//     "calendario" below.
//   - "descans": helping so she can rest is practical support, not advice.
const BANNED_TERMS = [
  "médic",
  "medic",
  "doctor",
  "remedio",
  "yuyo",
  "pohã",
  "dolor",
  "sangr",
  "síntoma",
  "sintoma",
  "comer",
  "aliment",
  "dieta",
  "nutri",
  "peso",
  "kilo",
  "engord",
  "vacun",
  "lactancia",
  "amamant",
  "pecho",
  "leche",
  "fiebre",
  "presión",
  "presion",
  "hospital",
  "sanatorio",
  "guardia",
  "emergencia",
  "urgencia",
  "pastilla",
  "vitamina",
  "fólico",
  "suplement",
  "ejercicio",
  "gestación",
  "semanas de",
  "riesgo",
  "normal",
  "náusea",
  "nausea",
  "mareo",
  "contracc",
  "ecograf",
  "salud",
  "receta",
  "dosis",
  "desarroll",
  "calendario",
  "cesárea",
  "ley ",
  "guaraníes",
  "gs.",
  "ips",
  "ministerio",
];

describe("the family lines", () => {
  it("is tagged es-PY", () => {
    expect(FAMILY_LINES_LANG).toBe("es-PY");
  });

  it("has one entry for every week the app covers, no gaps, no duplicates", () => {
    const weeks = PUBLISHED_FAMILY_LINES.map((entry) => entry.week);
    expect(new Set(weeks).size).toBe(weeks.length);
    expect([...weeks].sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i),
    );
  });

  it("keeps each line between 90 and 160 characters", () => {
    for (const entry of PUBLISHED_FAMILY_LINES) {
      expect(entry.text.length, `semana ${entry.week}`).toBeGreaterThanOrEqual(90);
      expect(entry.text.length, `semana ${entry.week}`).toBeLessThanOrEqual(160);
    }
  });

  it("says something different every week", () => {
    const texts = PUBLISHED_FAMILY_LINES.map((entry) => entry.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("carries no health content (banned-term guard)", () => {
    for (const entry of PUBLISHED_FAMILY_LINES) {
      const text = entry.text.toLowerCase();
      for (const term of BANNED_TERMS) {
        expect(text.includes(term), `semana ${entry.week} contiene «${term}»`).toBe(false);
      }
    }
  });

  it("the guard bites: a health line would fail it", () => {
    const sample = "Abuela, preparale un remedio de yuyos para el dolor y controlá su peso.";
    const hits = BANNED_TERMS.filter((term) => sample.toLowerCase().includes(term));
    expect(hits).toEqual(expect.arrayContaining(["remedio", "yuyo", "dolor", "peso"]));
  });

  it("has no emojis and no tuteo", () => {
    const text = PUBLISHED_FAMILY_LINES.map((entry) => entry.text).join(" ");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const tuteo of [" tienes ", " puedes ", " contigo", " tú "]) {
      expect(text.toLowerCase()).not.toContain(tuteo);
    }
  });

  it("returns null for a week outside the range", () => {
    expect(familyLine(0)).toBeNull();
    expect(familyLine(43)).toBeNull();
    expect(familyLine(20)).toContain("Mitad del camino");
  });

  it("the schema rejects a line outside the length limits", () => {
    expect(FamilyLineSchema.safeParse({ week: 3, text: "corta" }).success).toBe(false);
    expect(FamilyLineSchema.safeParse({ week: 3, text: "a".repeat(161) }).success).toBe(false);
    expect(FamilyLineSchema.safeParse({ week: 43, text: "a".repeat(100) }).success).toBe(false);
  });
});
