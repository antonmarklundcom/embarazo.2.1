import { describe, expect, it } from "vitest";

import {
  AI_DRAFT_MAX_WORDS,
  DEFAULT_DAILY_CAP,
  aiDraftDailyCap,
  aiDraftModel,
  buildDraftPrompt,
  isAiDraftEnabled,
  sanitiseDraftText,
} from "./draft";

// U9. Same non-negotiables as `lib/ai/babyImage.test.ts`: the feature fails
// closed with no key or flag, and every wrong config value means fewer
// drafts, never more.

const KEY = { GEMINI_API_KEY: "secret", AI_DRAFT_ENABLED: "true" };

describe("the kill switch", () => {
  it("fails closed when unset", () => {
    expect(isAiDraftEnabled({})).toBe(false);
  });

  it("needs the flag AND the key", () => {
    expect(isAiDraftEnabled({ GEMINI_API_KEY: "secret" })).toBe(false);
    expect(isAiDraftEnabled({ AI_DRAFT_ENABLED: "true" })).toBe(false);
    expect(isAiDraftEnabled(KEY)).toBe(true);
  });

  it("treats anything other than 'true' as off", () => {
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      expect(isAiDraftEnabled({ ...KEY, AI_DRAFT_ENABLED: value })).toBe(false);
    }
  });
});

describe("configuration", () => {
  it("defaults the model and lets env override it", () => {
    expect(aiDraftModel({})).toContain("gemini");
    expect(aiDraftModel({ AI_DRAFT_MODEL: "other" })).toBe("other");
  });

  it("defaults the daily cap to 20 when unset", () => {
    expect(aiDraftDailyCap({})).toBe(DEFAULT_DAILY_CAP);
  });

  it("reads a configured cap", () => {
    expect(aiDraftDailyCap({ AI_DRAFT_DAILY_CAP: "5" })).toBe(5);
  });

  it("allows zero — the softest kill switch there is", () => {
    expect(aiDraftDailyCap({ AI_DRAFT_DAILY_CAP: "0" })).toBe(0);
  });

  it("falls back rather than widening the cap on nonsense", () => {
    for (const value of ["", "muchos", "-1", "NaN", "Infinity"]) {
      expect(
        aiDraftDailyCap({ AI_DRAFT_DAILY_CAP: value }),
        `"${value}" must not widen the cap`,
      ).toBe(DEFAULT_DAILY_CAP);
    }
  });

  it("floors a fractional cap instead of rounding up", () => {
    expect(aiDraftDailyCap({ AI_DRAFT_DAILY_CAP: "2.9" })).toBe(2);
  });
});

describe("the prompt pins the app's stance", () => {
  const prompt = buildDraftPrompt("¿Es normal tener náuseas a las 8 semanas?");

  it("carries the question", () => {
    expect(prompt).toContain("¿Es normal tener náuseas a las 8 semanas?");
  });

  it("asks for voseo", () => {
    expect(prompt.toLowerCase()).toContain("voseo");
  });

  it("is informational, never a diagnosis or a dose", () => {
    const lower = prompt.toLowerCase();
    expect(lower).toContain("nunca diagnostiques");
    expect(lower).toContain("dosis");
  });

  it("always points alarm signs at the control prenatal and /emergencia", () => {
    const lower = prompt.toLowerCase();
    expect(lower).toContain("control prenatal");
    expect(prompt).toContain("/emergencia");
  });

  it("caps the length in words", () => {
    expect(prompt).toContain(String(AI_DRAFT_MAX_WORDS));
    expect(prompt.toLowerCase()).toContain("palabras");
  });

  it("bans markdown in the output", () => {
    expect(prompt.toLowerCase()).toContain("markdown");
  });
});

describe("sanitiseDraftText", () => {
  it("unwraps bold, italics, headings, bullets and inline code", () => {
    const raw = [
      "# Título",
      "Esto es **importante** y también *relevante*.",
      "- primer punto",
      "- segundo punto",
      "Usá `esto` así.",
    ].join("\n");
    const clean = sanitiseDraftText(raw);
    expect(clean).not.toMatch(/[#*`]/);
    expect(clean).not.toMatch(/^\s*-\s/m);
    expect(clean).toContain("Título");
    expect(clean).toContain("importante");
    expect(clean).toContain("relevante");
    expect(clean).toContain("primer punto");
    expect(clean).toContain("esto");
  });

  it("keeps an in-app route out of a markdown link", () => {
    const clean = sanitiseDraftText(
      "Mirá [la sección de emergencia](/emergencia) si tenés dudas.",
    );
    expect(clean).toContain("/emergencia");
    expect(clean).toContain("la sección de emergencia");
  });

  it("drops an external link, keeping only its label", () => {
    const clean = sanitiseDraftText(
      "Leé [más info](https://example.com/algo) antes de decidir.",
    );
    expect(clean).not.toContain("example.com");
    expect(clean).not.toContain("http");
    expect(clean).toContain("más info");
  });

  it("strips a bare external URL entirely", () => {
    const clean = sanitiseDraftText("Fuente: https://example.com/estudio");
    expect(clean).not.toContain("http");
    expect(clean).not.toContain("example.com");
  });

  it("collapses the blank lines formatting removal leaves behind", () => {
    const clean = sanitiseDraftText("# Uno\n\n\n\n# Dos");
    expect(clean).not.toMatch(/\n{3,}/);
  });
});
