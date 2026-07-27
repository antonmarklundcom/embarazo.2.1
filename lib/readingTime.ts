// Reading time (BUILD-PLAN C6 / FEATURE-MAP #17).
//
// Computed from the text rather than stored, so it can never drift out of sync
// with an edited article — and so nobody has to remember to update it.

/** Words per minute. Deliberately conservative for phone reading in a second
 * language for some readers, and for text that is often read carefully. */
const WORDS_PER_MINUTE = 180;

/** Strips tags and collapses whitespace. */
export function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
  if (text === "") return 0;
  return text.split(/\s+/).length;
}

/** Whole minutes, never zero — "0 min" reads like an error. */
export function readingMinutes(html: string): number {
  const words = countWords(html);
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** es-PY label, e.g. "3 min". */
export function readingTimeLabel(html: string): string {
  return `${readingMinutes(html)} min`;
}
