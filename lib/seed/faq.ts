import { FaqEntrySchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { FaqEntry, FaqTopic } from "../types";
import rawFaq from "./faq.json";

// BUILD-PLAN E6 — the FAQ (feature map #29).
//
// BUILD-PLAN's line for this task is the useful one: it is "reused for the
// privacy/account trust moment". That is what the topics are for — the same
// nine answers, asked for by subject wherever they belong, instead of a page
// nobody visits and a separate paragraph on /privacidad that drifts from it.
//
// The answers are written to be true *today*, including where the truth is
// awkward: "si no ves un nombre ahí, es porque todavía no terminamos esa
// revisión" is the honest state of the medical byline (Z2), and saying so is
// worth more than a confident sentence that would have to be walked back.

const { valid, errors } = validateContentArray(
  "lib/seed/faq.json",
  rawFaq as unknown[],
  FaqEntrySchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/faq.json:\n${errors.join("\n")}`);
}

export const PUBLISHED_FAQ: FaqEntry[] = publishedOnly(valid);

export const FAQ_TOPIC_LABELS: Record<FaqTopic, string> = {
  privacidad: "Privacidad",
  cuenta: "Tu cuenta",
  app: "La app",
  salud: "Salud",
};

/** The questions for a set of topics, in file order. */
export function faqFor(topics?: readonly FaqTopic[]): FaqEntry[] {
  if (!topics || topics.length === 0) return PUBLISHED_FAQ;
  return PUBLISHED_FAQ.filter((entry) => topics.includes(entry.topic));
}
