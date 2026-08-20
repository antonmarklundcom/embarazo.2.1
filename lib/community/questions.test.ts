import { describe, expect, it } from "vitest";

import {
  ANSWER_MAX,
  ANSWER_MIN,
  QUESTION_MAX,
  QUESTION_MIN,
  QUESTIONS_PER_DAY,
  QUESTION_STATUSES,
  STATUS_COPY,
  answerSchema,
  isPublishable,
  questionSchema,
  type QuestionStatus,
} from "./questions";

describe("question length rules", () => {
  it("rejects what cannot be answered and what is not a question any more", () => {
    expect(questionSchema.safeParse("ayuda").success).toBe(false);
    expect(questionSchema.safeParse("   ").success).toBe(false);
    expect(questionSchema.safeParse("x".repeat(QUESTION_MAX + 1)).success).toBe(
      false,
    );
    expect(
      questionSchema.safeParse("¿Puedo tomar tereré en el embarazo?").success,
    ).toBe(true);
  });

  it("trims before measuring, so whitespace cannot buy length", () => {
    const padded = `   ${"a".repeat(QUESTION_MIN - 1)}   `;
    expect(questionSchema.safeParse(padded).success).toBe(false);
    const parsed = questionSchema.parse(`  ${"a".repeat(QUESTION_MIN)}  `);
    expect(parsed).toHaveLength(QUESTION_MIN);
  });

  it("lets an answer be longer than a question", () => {
    // An honest answer often has to caveat itself ("…pero preguntale a tu
    // médico porque depende de X"), and a cap that forces the caveat out is a
    // cap that makes the answers worse.
    expect(ANSWER_MAX).toBeGreaterThan(QUESTION_MAX);
    expect(answerSchema.safeParse("x".repeat(ANSWER_MIN)).success).toBe(true);
    expect(answerSchema.safeParse("x".repeat(ANSWER_MAX + 1)).success).toBe(false);
  });

  it("keeps the daily cap small enough to mean something", () => {
    // This is not a forum. Three unanswered questions from one person is
    // already a support conversation, and the fix for that is a reply.
    expect(QUESTIONS_PER_DAY).toBeGreaterThan(0);
    expect(QUESTIONS_PER_DAY).toBeLessThanOrEqual(5);
  });
});

describe("isPublishable", () => {
  it("is true only for an approved question that actually has an answer", () => {
    expect(isPublishable({ status: "approved", answer: "Sí, con moderación." })).toBe(
      true,
    );
  });

  it("refuses an approved row with no answer", () => {
    // The accidental form of "public unreviewed content": a question published
    // on its own, with the app's name on the page and nothing under it.
    expect(isPublishable({ status: "approved", answer: null })).toBe(false);
    expect(isPublishable({ status: "approved", answer: "   " })).toBe(false);
  });

  it("refuses everything that is not approved, answered or not", () => {
    for (const status of ["pending", "rejected"] as QuestionStatus[]) {
      expect(isPublishable({ status, answer: "Sí." }), status).toBe(false);
      expect(isPublishable({ status, answer: null }), status).toBe(false);
    }
  });
});

describe("what the asker is told", () => {
  it("has copy for every state, including the one nobody likes writing", () => {
    for (const status of QUESTION_STATUSES) {
      expect(STATUS_COPY[status].label.length, status).toBeGreaterThan(0);
      expect(STATUS_COPY[status].detail.length, status).toBeGreaterThan(0);
    }
  });

  it("tells a rejected asker where to go instead of just saying no", () => {
    // A question that vanishes silently reads as a bug and gets asked again.
    // A "no" that ends there is worse than useless when the reason is "this
    // needs your doctor".
    expect(STATUS_COPY.rejected.detail).toMatch(/médico|Emergencia/);
  });

  it("promises anonymity in the copy the asker actually reads", () => {
    expect(STATUS_COPY.pending.detail).toMatch(/sin tu nombre/);
    expect(STATUS_COPY.approved.detail).toMatch(/sin tu nombre/);
  });
});
