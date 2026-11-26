import { describe, expect, it } from "vitest";

import {
  CONVERSATION_CARDS_LANG,
  CONVERSATION_THEMES_IN_USE,
  PUBLISHED_CONVERSATION_CARDS,
  conversationCards,
} from "./conversationCards";
import { CONVERSATION_THEMES, ConversationCardSchema } from "../../content/schemas";

// The cards are conversation starters only. This list is the teeth of that
// rule: a question touching health (symptoms, food, medicines, remedies, the
// birth as a medical event, breastfeeding or formula, vaccines, sleep safety,
// risk, what is normal), laws, leave, amounts of money or institutions fails.
// It also keeps out wording that assumes who the companion is (a man, a
// husband) or that this is her first baby.
//
// Matched lowercase, at the start of a word; stems where Spanish inflects
// ("sangr", "vacun", "amamant"). Taken from lib/seed/py/familyLines.test.ts and
// widened. Word-start rather than plain substring because "parto" sits inside
// "reparto" (the theme about sharing the work); "anormal" is listed on its own
// for the same reason.
// Dropped on purpose, because they blocked innocent questions without catching
// anything the other terms miss:
//   - "comida": who cooks is a question about sharing the work, not food
//     advice. Food rules are kept out by "comer", "aliment", "dieta", "nutri".
//   - "descans": taking turns so both can rest is about sharing the night,
//     not sleep advice. Sleep safety is kept out by "dorm", "cuna", "colecho".
//   - "té": a substring of "esté", "estés", etc.
const BANNED_TERMS = [
  // health
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
  "mamadera",
  "fórmula",
  "formula",
  "fiebre",
  "presión",
  "presion",
  "hospital",
  "sanatorio",
  "clínica",
  "clinica",
  "guardia",
  "emergencia",
  "urgencia",
  "pastilla",
  "vitamina",
  "fólico",
  "suplement",
  "ejercicio",
  "gestación",
  "riesgo",
  "normal",
  "anormal",
  "náusea",
  "nausea",
  "contracc",
  "ecograf",
  "salud",
  "receta",
  "dosis",
  "desarroll",
  "control",
  "parto",
  "cesárea",
  "cesarea",
  "epidural",
  "anestesia",
  "dorm",
  "cuna",
  "colecho",
  "depresi",
  // laws, leave, money amounts, institutions
  "ley ",
  "licencia",
  "permiso",
  "subsidio",
  "derecho",
  "guaraní",
  "guarani",
  "gs.",
  "ips",
  "ministerio",
  "registro civil",
  // who the companion is, which baby this is
  "esposo",
  "marido",
  "novio",
  "papá",
  "primer bebé",
  "primer hijo",
  "primera vez",
];

const LETTER = "a-záéíóúüñ";
/** True when `term` appears in `text` starting at a word boundary. */
function mentions(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^${LETTER}])${escaped}`, "u").test(text.toLowerCase());
}

describe("the conversation cards", () => {
  it("is tagged es-PY", () => {
    expect(CONVERSATION_CARDS_LANG).toBe("es-PY");
  });

  it("has 36 published cards with unique ids and unique questions", () => {
    expect(PUBLISHED_CONVERSATION_CARDS).toHaveLength(36);
    const ids = PUBLISHED_CONVERSATION_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = PUBLISHED_CONVERSATION_CARDS.map((card) => card.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("has six cards for each of the six themes", () => {
    expect(CONVERSATION_THEMES_IN_USE).toEqual([...CONVERSATION_THEMES]);
    for (const theme of CONVERSATION_THEMES) {
      expect(conversationCards(theme), theme).toHaveLength(6);
    }
    expect(conversationCards(null)).toHaveLength(36);
  });

  it("keeps each question between 60 and 140 characters, as one open question", () => {
    for (const card of PUBLISHED_CONVERSATION_CARDS) {
      expect(card.text.length, card.id).toBeGreaterThanOrEqual(60);
      expect(card.text.length, card.id).toBeLessThanOrEqual(140);
      expect(card.text, card.id).toContain("¿");
      expect(card.text.trim().endsWith("?"), card.id).toBe(true);
    }
  });

  it("carries no health, legal or money content (banned-term guard)", () => {
    for (const card of PUBLISHED_CONVERSATION_CARDS) {
      for (const term of BANNED_TERMS) {
        expect(mentions(card.text, term), `${card.id} contiene «${term}»`).toBe(false);
      }
      expect(card.text, `${card.id} tiene un número`).not.toMatch(/\d/);
    }
  });

  it("the guard bites: a health or legal question would fail it", () => {
    const sample =
      "¿Vamos a dar pecho o mamadera, qué dice la ley de la licencia y qué parto queremos en el hospital?";
    const hits = BANNED_TERMS.filter((term) => mentions(sample, term));
    expect(hits).toEqual(
      expect.arrayContaining(["pecho", "mamadera", "ley ", "licencia", "parto", "hospital"]),
    );
    // ...and the word-start match still catches an inflected stem.
    expect(mentions("¿Qué vacunas le damos?", "vacun")).toBe(true);
    expect(mentions("¿Cómo va el reparto de tareas?", "parto")).toBe(false);
  });

  it("has no emojis and no tuteo", () => {
    const text = PUBLISHED_CONVERSATION_CARDS.map((card) => card.text).join(" ");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const tuteo of [" tienes ", " puedes ", " quieres ", " contigo", " tú ", " imaginas"]) {
      expect(text.toLowerCase()).not.toContain(tuteo);
    }
  });

  it("the schema rejects a card outside the limits or with an unknown theme", () => {
    const ok = { id: "casa-9", theme: "casa", text: "a".repeat(80) };
    expect(ConversationCardSchema.safeParse(ok).success).toBe(true);
    expect(ConversationCardSchema.safeParse({ ...ok, text: "corta" }).success).toBe(false);
    expect(ConversationCardSchema.safeParse({ ...ok, text: "a".repeat(141) }).success).toBe(false);
    expect(ConversationCardSchema.safeParse({ ...ok, theme: "salud" }).success).toBe(false);
    expect(ConversationCardSchema.safeParse({ ...ok, id: "Casa 9" }).success).toBe(false);
  });
});
