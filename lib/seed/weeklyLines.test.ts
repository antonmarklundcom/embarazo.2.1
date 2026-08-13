import { describe, expect, it } from "vitest";

import { PUBLISHED_WEEKLY_LINES, weeklyLine } from "./weeklyLines";
import { WeeklyLineSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";

// BUILD-PLAN C2: "42 strings, code ships with a graceful fallback so content
// can land later". Both halves are tested — the content that exists today, and
// the behaviour when a week's line does not.

describe("the 42 strings", () => {
  it("covers every week of the pregnancy, once each", () => {
    const weeks = PUBLISHED_WEEKLY_LINES.map((entry) => entry.week).sort(
      (a, b) => a - b,
    );
    expect(weeks).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it("says something different every week", () => {
    // A copy-paste that leaves two weeks identical reads, to a user checking
    // in weekly, as an app that stopped working.
    const lines = PUBLISHED_WEEKLY_LINES.map((entry) => entry.line);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("stays on one line", () => {
    for (const entry of PUBLISHED_WEEKLY_LINES) {
      expect(
        entry.line.length,
        `semana ${entry.week} es demasiado larga para el bloque`,
      ).toBeLessThanOrEqual(110);
    }
  });

  it("is written in voseo, not tuteo", () => {
    // es-PY is a standing rule (BUILD-PLAN §8), and the tuteo forms below are
    // the ones that actually slip in when copy is drafted elsewhere.
    const text = PUBLISHED_WEEKLY_LINES.map((entry) => entry.line).join(" ");
    for (const tuteo of [
      " tienes ",
      " puedes ",
      " sientes ",
      " tu bebé está creciendo contigo",
      " tú ",
    ]) {
      expect(text.toLowerCase()).not.toContain(tuteo);
    }
  });
});

describe("the fallback", () => {
  it("returns null for a week with no line", () => {
    // The home block renders nothing for this, rather than an empty card.
    expect(weeklyLine(0)).toBeNull();
    expect(weeklyLine(43)).toBeNull();
    expect(weeklyLine(-1)).toBeNull();
    expect(weeklyLine(1.5)).toBeNull();
  });

  it("returns the line for a week that has one", () => {
    expect(weeklyLine(20)).toContain("Mitad del camino");
  });
});

describe("the gates the content passes through", () => {
  it("rejects a line longer than the block can hold", () => {
    const tooLong = { week: 5, line: "a".repeat(200) };
    expect(WeeklyLineSchema.safeParse(tooLong).success).toBe(false);
  });

  it("rejects a week outside 1–42", () => {
    for (const week of [0, 43, 1.5]) {
      expect(WeeklyLineSchema.safeParse({ week, line: "algo" }).success).toBe(
        false,
      );
    }
  });

  it("names the file and the entry when a line is malformed", () => {
    const { errors } = validateContentArray(
      "lib/seed/weeklyLines.json",
      [{ week: 99, line: "algo" }],
      WeeklyLineSchema,
      (entry) => String(entry.week),
    );
    expect(errors[0]).toContain("lib/seed/weeklyLines.json");
    expect(errors[0]).toContain("semana");
  });

  it("catches two entries for the same week", () => {
    const { errors } = validateContentArray(
      "lib/seed/weeklyLines.json",
      [
        { week: 7, line: "una" },
        { week: 7, line: "otra" },
      ],
      WeeklyLineSchema,
      (entry) => String(entry.week),
    );
    expect(errors.join(" ")).toContain("duplicado");
  });

  it("hides a week left as placeholder text during a content pass", () => {
    const gated = publishedOnly([
      { week: 1, line: "(placeholder) escribir esto" },
      { week: 2, line: "Es la semana de la ovulación." },
    ]);
    expect(gated.map((entry) => entry.week)).toEqual([2]);
  });
});
