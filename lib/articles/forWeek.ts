import type { Article } from "../types";

// BUILD-PLAN C6 — which guías belong to which week (feature map #15).
//
// Pure, and separate from the seed loader, so the ordering rule is testable
// against hand-made fixtures instead of against whatever the eight shipped
// articles happen to look like this month.

/** How many the home rail shows. Three fits without becoming a second /guias. */
export const WEEK_FEED_SIZE = 3;

function width(article: Article): number {
  if (article.fromWeek === undefined || article.toWeek === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  return article.toWeek - article.fromWeek;
}

function matchesWeek(article: Article, week: number): boolean {
  if (article.fromWeek === undefined || article.toWeek === undefined) return true;
  return week >= article.fromWeek && week <= article.toWeek;
}

/**
 * The guías for a week, most specific first.
 *
 * An article with no range is relevant to the whole pregnancy (señales de
 * alarma, dengue), so it never disqualifies itself — it just sorts last. That
 * is what stops week 17, which no article names specifically, from showing an
 * empty rail: the fallback articles are genuinely worth reading in week 17,
 * they are simply not *about* week 17.
 *
 * Ties keep the file's order, so a content editor can decide what leads by
 * moving an entry rather than by discovering an invisible rule.
 */
export function articlesForWeek(
  articles: readonly Article[],
  week: number,
  limit: number = WEEK_FEED_SIZE,
): Article[] {
  return articles
    .filter((article) => matchesWeek(article, week))
    .map((article, index) => ({ article, index }))
    .sort((a, b) => width(a.article) - width(b.article) || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.article);
}

/** True when the article names this week specifically rather than the whole pregnancy. */
export function isWeekSpecific(article: Article): boolean {
  return article.fromWeek !== undefined && article.toWeek !== undefined;
}
