import { describe, expect, it } from "vitest";

import { PUBLISHED_FAQ, faqFor } from "./faq";
import { FaqEntrySchema } from "../content/schemas";

// BUILD-PLAN E6. A FAQ is only worth having if the answers are true, so the
// tests that matter here check that the answers say what the app actually does
// — including the parts that are awkward to admit.

describe("the questions", () => {
  it("answers the three the task names", () => {
    const questions = PUBLISHED_FAQ.map((entry) => entry.question.toLowerCase());
    expect(questions.some((q) => q.includes("quién ve mis datos"))).toBe(true);
    expect(questions.some((q) => q.includes("borro la app"))).toBe(true);
    expect(questions.some((q) => q.includes("obstetra"))).toBe(true);
  });

  it("has no duplicate ids or repeated questions", () => {
    const ids = PUBLISHED_FAQ.map((entry) => entry.id);
    const questions = PUBLISHED_FAQ.map((entry) => entry.question);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("keeps every answer readable in one screen", () => {
    for (const entry of PUBLISHED_FAQ) {
      expect(FaqEntrySchema.safeParse(entry).success, entry.id).toBe(true);
    }
  });
});

describe("the answers match what the app does", () => {
  function answer(id: string): string {
    return PUBLISHED_FAQ.find((entry) => entry.id === id)!.answer.toLowerCase();
  }

  it("says photos never leave the phone (§4.4)", () => {
    const text = answer("faq-notas-fotos");
    expect(text).toContain("nunca salen del teléfono");
    expect(text).toContain("no se sincronizan");
  });

  it("describes the companion view as E1 actually built it", () => {
    // Week, due date, next control, baby name — and explicitly not the notes.
    const text = answer("faq-quien-ve-mis-datos");
    expect(text).toContain("semana");
    expect(text).toContain("próximo control");
    expect(text).toContain("nunca tus notas");
  });

  it("does not promise a backup that does not exist without an account", () => {
    const text = answer("faq-borro-la-app");
    expect(text).toContain("no hay forma de recuperarlo");
    expect(text).toContain("copia de seguridad");
  });

  it("admits the medical review is not finished", () => {
    // Z2's rule as prose: never claim a review that has not happened. The
    // uncomfortable half of the answer is the half worth testing.
    const text = answer("faq-revisa-obstetra");
    expect(text).toContain("todavía no terminamos esa revisión");
    expect(text).toContain("no reemplaza");
  });

  it("says the emergency screen does not decide for her", () => {
    expect(answer("faq-emergencia")).toContain("no para decidir por vos");
  });
});

describe("faqFor", () => {
  it("returns everything when asked for nothing", () => {
    expect(faqFor()).toHaveLength(PUBLISHED_FAQ.length);
    expect(faqFor([])).toHaveLength(PUBLISHED_FAQ.length);
  });

  it("filters by topic, so each embed asks for what belongs on its screen", () => {
    const privacy = faqFor(["privacidad", "cuenta"]);
    expect(privacy.length).toBeGreaterThan(0);
    for (const entry of privacy) {
      expect(["privacidad", "cuenta"]).toContain(entry.topic);
    }
  });

  it("covers every topic, so no embed can render an empty accordion", () => {
    for (const topic of ["privacidad", "cuenta", "app", "salud"] as const) {
      expect(faqFor([topic]).length, topic).toBeGreaterThan(0);
    }
  });
});
