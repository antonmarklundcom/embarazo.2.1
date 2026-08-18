import {
  InsightTemplateSchema,
  validateContentArray,
  type InsightTemplate,
} from "../content/schemas";
import { publishedOnly } from "./gate";
import rawTemplates from "./insights.json";

// BUILD-PLAN K9 / F3 — the words.
//
// `lib/insights/patterns.ts` produces a *finding*: a symptom and four numbers.
// This file turns one into a sentence, and it is a **seed file so that a
// medical reviewer can read every sentence the app will ever say about
// somebody's symptoms in one sitting**, without reading TypeScript. That is
// what the task means by "reviewed phrasing", and it is the same separation C5
// made between an obstetra's note and the code that places it.
//
// Three properties are asserted by `insights.test.ts` rather than trusted:
//
//   * **No causal or diagnostic language.** Every line is an observation about
//     what she wrote down — "anotaste X en 5 de los 7 días que…" — and never
//     "X te causa Y", never "tenés", never "es normal". Co-occurrence is what
//     was computed; anything stronger would be the app practising medicine.
//   * **Every line ends up pointing at her control.** The `hint` is not a
//     disclaimer bolted on; it is the useful half. The thing to do with a
//     pattern is tell the person who can act on it.
//   * **Every placeholder the templates use is one the finding provides**, so
//     a sentence can never render with `{withDays}` in it.

const { valid, errors } = validateContentArray(
  "lib/seed/insights.json",
  rawTemplates as unknown[],
  InsightTemplateSchema,
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/insights.json:\n${errors.join("\n")}`,
  );
}

export type { InsightTemplate };

export const PUBLISHED_INSIGHT_TEMPLATES: InsightTemplate[] = publishedOnly(valid);

/** The placeholders a template may use. Anything else is a bug, not a feature. */
export const INSIGHT_PLACEHOLDERS = [
  "symptom",
  "withCount",
  "withDays",
  "withoutCount",
  "withoutDays",
] as const;

export function insightTemplate(id: string): InsightTemplate | undefined {
  return PUBLISHED_INSIGHT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Fill a template.
 *
 * Returns null when a placeholder has no value rather than rendering the brace
 * — a sentence with `{withDays}` in it, about somebody's symptoms, is worse
 * than no sentence.
 */
export function renderInsight(
  template: InsightTemplate,
  values: Record<string, string | number>,
): { line: string; hint: string } | null {
  let missing = false;
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = values[key];
      if (value === undefined) {
        missing = true;
        return "";
      }
      return String(value);
    });

  const line = fill(template.line);
  const hint = fill(template.hint);
  return missing ? null : { line, hint };
}
