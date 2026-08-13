// BUILD-PLAN C6 — read time (feature map #17).
//
// Computed from the article body, never stored: a stored figure is a number
// somebody has to remember to update, and the first edit that skips it makes
// every other one untrustworthy.

/**
 * Words per minute.
 *
 * 180 rather than the 200–265 usually quoted for English prose: this is
 * Spanish, read on a phone, often standing up, and the articles are practical
 * (a list of what to take to the sanatorio is read slower than a story). The
 * failure to avoid is under-promising the reader's time and having her stop
 * halfway.
 */
export const WORDS_PER_MINUTE = 180;

/** Strips tags and entities so `<li>` items do not glue two words together. */
export function textFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = textFromHtml(html);
  return text === "" ? 0 : text.split(" ").length;
}

/** Whole minutes, never zero — "0 min de lectura" reads as broken. */
export function readingMinutes(html: string): number {
  return Math.max(1, Math.round(countWords(html) / WORDS_PER_MINUTE));
}

/** "4 min de lectura" — the label, in one place, so it cannot drift. */
export function readTimeLabel(html: string): string {
  return `${readingMinutes(html)} min de lectura`;
}
