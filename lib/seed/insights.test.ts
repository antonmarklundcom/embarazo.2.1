import { describe, expect, it } from "vitest";

import {
  INSIGHT_PLACEHOLDERS,
  PUBLISHED_INSIGHT_TEMPLATES,
  insightTemplate,
  renderInsight,
} from "./insights";

// BUILD-PLAN K9 / F3. This file is the reviewable artefact: every sentence the
// app will ever say about somebody's symptoms, in one place, in Spanish, for a
// medical reviewer to read without reading TypeScript.
//
// The tests below are the guardrails around that review — the properties that
// must hold no matter how the copy is later edited.

const IDS = ["sleep", "mood", "frequent"];

describe("the seed", () => {
  it("has a template for every finding the logic can produce", () => {
    // A finding with no template renders nothing, which would be a silent
    // feature outage rather than a visible bug.
    expect(PUBLISHED_INSIGHT_TEMPLATES.map((t) => t.id).sort()).toEqual(
      [...IDS].sort(),
    );
    for (const id of IDS) expect(insightTemplate(id), id).toBeDefined();
  });
});

describe("no template may claim more than co-occurrence", () => {
  const ALL = PUBLISHED_INSIGHT_TEMPLATES.flatMap((t) => [t.line, t.hint]);

  it("uses no causal language", () => {
    // What was computed is "these happened on the same days". Anything
    // stronger is the app practising medicine on the strength of a fortnight
    // of self-reported check-ins.
    const causal = [
      /\bporque\b/i,
      /\bcausa[dns]?\b/i,
      /\bprovoca/i,
      /\bgenera\b/i,
      /\bpor culpa\b/i,
      /\bdebido a\b/i,
      /\bse debe a\b/i,
      /\bpor eso\b/i,
    ];
    for (const text of ALL) {
      for (const pattern of causal) {
        expect(pattern.test(text), `"${text}" matches ${pattern}`).toBe(false);
      }
    }
  });

  it("uses no diagnostic or reassuring language", () => {
    // "Es normal" is the most dangerous sentence in a pregnancy app: it is a
    // clinical judgement, and it is the one a user will remember instead of
    // calling.
    const clinical = [
      /\bes normal\b/i,
      /\bno te preocupes\b/i,
      /\btenés\s+(un|una)\b/i,
      /\bdiagn[óo]stic/i,
      /\bs[íi]ntoma de\b/i,
      /\btratamiento\b/i,
      /\bdeber[íi]as tomar\b/i,
      /\bes grave\b/i,
    ];
    for (const text of ALL) {
      for (const pattern of clinical) {
        expect(pattern.test(text), `"${text}" matches ${pattern}`).toBe(false);
      }
    }
  });

  it("describes what she wrote down, in her own past tense", () => {
    // Every line is about her log — "anotaste" — not about her body.
    for (const template of PUBLISHED_INSIGHT_TEMPLATES) {
      expect(template.line, template.id).toMatch(/anotaste|anotás/i);
    }
  });

  it("points every finding at her control", () => {
    // The hint is not a disclaimer bolted on; it is the useful half. The thing
    // to do with a pattern is tell the person who can act on it.
    for (const template of PUBLISHED_INSIGHT_TEMPLATES) {
      expect(template.hint, template.id).toMatch(
        /control|m[ée]dic|obstetra|profesional/i,
      );
    }
  });

  it("is voseo, like the rest of the app", () => {
    for (const text of ALL) {
      expect(/\btienes\b|\bpuedes\b|\bdebes\b|\btu tienes\b/i.test(text), text).toBe(
        false,
      );
    }
  });
});

describe("placeholders", () => {
  it("uses only names the finding actually provides", () => {
    // Otherwise a sentence renders with `{withDays}` in it, about somebody's
    // symptoms.
    for (const template of PUBLISHED_INSIGHT_TEMPLATES) {
      for (const text of [template.line, template.hint]) {
        for (const match of text.matchAll(/\{(\w+)\}/g)) {
          expect(
            (INSIGHT_PLACEHOLDERS as readonly string[]).includes(match[1]!),
            `${template.id} uses {${match[1]}}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("renderInsight", () => {
  const template = insightTemplate("sleep")!;

  it("fills every placeholder", () => {
    const rendered = renderInsight(template, {
      symptom: "náuseas",
      withCount: 6,
      withDays: 7,
      withoutCount: 1,
      withoutDays: 7,
    })!;
    expect(rendered.line).toContain("náuseas");
    expect(rendered.line).toContain("6");
    expect(rendered.line).not.toMatch(/\{|\}/);
    expect(rendered.hint).not.toMatch(/\{|\}/);
  });

  it("returns null rather than a sentence with a brace in it", () => {
    expect(renderInsight(template, { symptom: "náuseas" })).toBeNull();
  });

  it("renders zero as zero, not as missing", () => {
    // `0` is falsy and is a perfectly good count — "en 0 de los otros 7 días"
    // is the most informative half of the sentence.
    const rendered = renderInsight(template, {
      symptom: "acidez",
      withCount: 5,
      withDays: 6,
      withoutCount: 0,
      withoutDays: 8,
    })!;
    expect(rendered).not.toBeNull();
    expect(rendered.line).toContain("0");
  });
});
