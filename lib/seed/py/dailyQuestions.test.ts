import { describe, expect, it } from "vitest";

import { DAILY_QUESTIONS_LANG, PUBLISHED_DAILY_QUESTIONS } from "./dailyQuestions";
import { DailyQuestionSchema } from "../../content/schemas";
import { ContentIdSchema } from "../../stats/contentStats";

// "Pregunta del día". The questions are light on purpose: preferences, plans,
// family, traditions and feelings about what is coming. Nothing where the
// majority answer could read as health advice or make someone worry she is not
// normal, and nothing that assumes a partner, a first baby, a planned
// pregnancy, a religion or a supportive family.
//
// The banned-term list is the teeth of the first rule. Terms are matched at
// the START of a word (lowercase), so stems catch inflections ("dorm" catches
// dormir/dormís, "vacun" catches vacuna/vacunas) without catching innocent
// words that merely contain them.
// Dropped on purpose, because they blocked innocent questions without catching
// anything the other terms miss:
//   - "noche": "todas las noches" (reading stories) is a plan, not sleep advice;
//     sleep itself is kept out by "dorm", "sueño" and "descans".
//   - "familia": the family is an allowed topic; an unsupportive family is
//     covered by every question carrying an answer that fits her on her own.
//   - "pareja": allowed as ONE answer among others ("Mi pareja"), never assumed
//     in a question. The assumption test below checks the question texts.
const BANNED_TERMS = [
  // Health, body, symptoms.
  "médic", "medic", "doctor", "salud", "síntoma", "sintoma", "dolor", "sangr",
  "fiebre", "presión", "presion", "náusea", "nausea", "mareo", "contracc",
  "cuerpo", "panza", "barriga", "normal", "riesgo",
  // Weight, eating, cravings.
  "peso", "kilo", "engord", "comer", "comida", "aliment", "dieta", "nutri",
  "antojo", "vitamina", "suplement", "fólico",
  // Sleep and exercise.
  "dorm", "sueño", "descans", "ejercicio", "caminar", "gimnasia",
  // The baby's movement.
  "movimient", "patad", "se mueve",
  // Medicines and remedies.
  "remedio", "yuyo", "pohã", "pastilla", "receta", "dosis", "medicament",
  // Controls, scans, type of birth, breastfeeding, vaccines.
  "control", "ecograf", "estudio", "análisis", "parto", "cesárea", "epidural",
  "natural", "lactancia", "amamant", "pecho", "leche", "teta", "vacun",
  "hospital", "sanatorio", "guardia", "emergencia", "urgencia", "ips",
  // Work leave and money.
  "trabajo", "licencia", "permiso", "plata", "dinero", "precio", "cuesta",
  "guaraníes", "gs.", "gastar", "gasto",
  // Assumptions: a first baby, a planned pregnancy, a religion.
  "primer hij", "primer bebé", "primer embarazo", "planead", "buscado",
  "dios", "iglesia", "bautism", "bautiz", "rezar", "virgen",
];

function hasTermAtWordStart(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, "u").test(text.toLowerCase());
}

// An answer that fits a woman on her own, without a partner or family to name.
const OPEN_ANSWER =
  /todavía|prefiero|nadie|no sé|no pensé|no me|no es|no hay|no en mi|no por ahora|sola|otro|otra|me da igual|^a mí$|yo$|con quien esté|donde haya/i;

describe("the daily questions", () => {
  it("is tagged es-PY", () => {
    expect(DAILY_QUESTIONS_LANG).toBe("es-PY");
  });

  it("has 45 questions with unique ids", () => {
    const ids = PUBLISHED_DAILY_QUESTIONS.map((question) => question.id);
    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("says something different every day", () => {
    const texts = PUBLISHED_DAILY_QUESTIONS.map((question) => question.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("gives every question 2 to 4 answers with unique keys", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      expect(question.options.length, question.id).toBeLessThanOrEqual(4);
      const keys = question.options.map((option) => option.key);
      expect(new Set(keys).size, question.id).toBe(keys.length);
      const labels = question.options.map((option) => option.label);
      expect(new Set(labels).size, question.id).toBe(labels.length);
    }
  });

  it("keeps questions between 40 and 110 characters and answers up to 28", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      expect(question.text.length, question.id).toBeGreaterThanOrEqual(40);
      expect(question.text.length, question.id).toBeLessThanOrEqual(110);
      for (const option of question.options) {
        expect(option.label.length, `${question.id}/${option.key}`).toBeLessThanOrEqual(28);
      }
    }
  });

  it("makes every counter id fit the anonymous counter's alphabet", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      for (const option of question.options) {
        const id = `poll-${question.id}-${option.key}`;
        expect(ContentIdSchema.safeParse(id).success, id).toBe(true);
      }
    }
  });

  it("carries no health, money or assumption terms (banned-term guard)", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      const text = [question.text, ...question.options.map((option) => option.label)].join(" | ");
      for (const term of BANNED_TERMS) {
        expect(hasTermAtWordStart(text, term), `${question.id} contiene «${term}»`).toBe(false);
      }
    }
  });

  it("the guard bites, and only at the start of a word", () => {
    const sample = "¿Cuánto dormís y qué antojos tenés antes del control y el parto?";
    const hits = BANNED_TERMS.filter((term) => hasTermAtWordStart(sample, term));
    expect(hits).toEqual(expect.arrayContaining(["dorm", "antojo", "control", "parto"]));
    // "ips" inside "chips" or "parto" inside "departamento" are not hits.
    expect(hasTermAtWordStart("unos chips del departamento", "ips")).toBe(false);
    expect(hasTermAtWordStart("unos chips del departamento", "parto")).toBe(false);
  });

  it("never assumes a partner in the question itself", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      for (const term of ["pareja", "marido", "esposo", "novio", "papá del bebé", "tienen"]) {
        expect(hasTermAtWordStart(question.text, term), `${question.id}: «${term}»`).toBe(false);
      }
    }
  });

  it("offers every question an answer that fits a woman on her own", () => {
    for (const question of PUBLISHED_DAILY_QUESTIONS) {
      const open = question.options.filter((option) => OPEN_ANSWER.test(option.label));
      expect(open.length, question.id).toBeGreaterThan(0);
    }
  });

  it("has no emojis and no tuteo", () => {
    const text = PUBLISHED_DAILY_QUESTIONS.flatMap((question) => [
      question.text,
      ...question.options.map((option) => option.label),
    ]).join(" ");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const tuteo of [" tienes ", " puedes ", " quieres ", " contigo", " tú "]) {
      expect(text.toLowerCase()).not.toContain(tuteo);
    }
  });

  it("the schema rejects a bad question", () => {
    const ok = {
      id: "ejemplo",
      text: "¿Esta es una pregunta de ejemplo con largo suficiente?",
      options: [
        { key: "a", label: "Sí" },
        { key: "b", label: "Todavía no" },
      ],
    };
    expect(DailyQuestionSchema.safeParse(ok).success).toBe(true);
    expect(DailyQuestionSchema.safeParse({ ...ok, text: "¿Corta?" }).success).toBe(false);
    expect(DailyQuestionSchema.safeParse({ ...ok, text: "a".repeat(111) }).success).toBe(false);
    expect(DailyQuestionSchema.safeParse({ ...ok, options: [ok.options[0]] }).success).toBe(false);
    expect(
      DailyQuestionSchema.safeParse({
        ...ok,
        options: [...ok.options, { key: "c", label: "x" }, { key: "d", label: "y" }, { key: "e", label: "z" }],
      }).success,
    ).toBe(false);
    expect(
      DailyQuestionSchema.safeParse({ ...ok, options: [ok.options[0], { key: "a", label: "Otra" }] }).success,
    ).toBe(false);
    expect(
      DailyQuestionSchema.safeParse({ ...ok, options: [ok.options[0], { key: "b", label: "a".repeat(29) }] })
        .success,
    ).toBe(false);
    expect(DailyQuestionSchema.safeParse({ ...ok, id: "Con Mayúsculas" }).success).toBe(false);
    expect(DailyQuestionSchema.safeParse({ ...ok, extra: true }).success).toBe(false);
  });
});
