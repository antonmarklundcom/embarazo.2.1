import type { Article } from "../types";
// Extension-qualified, like `lib/content/schemas.ts`'s import of
// `../departments.ts`: the index generator runs under plain Node, which does
// not do the bundler's extensionless resolution.
import { readingMinutes } from "./readTime.ts";

// K11 (G3 performance budget) — the article *index*.
//
// ## The problem this solves
//
// `WeekArticleFeed` and `PopularThisWeek` are client components on the home
// screen, and both imported `ARTICLES` from `lib/seed/articles`. That import
// costs the browser three things it has no use for:
//
//   1. **Every article body.** `articles.json` is ~17 kB of HTML, and the home
//      screen renders none of it — it renders eight titles and links away.
//   2. **zod, and `lib/content/schemas.ts` with it.** The seed loader validates
//      at import time, which is exactly right on a server and pure weight in a
//      browser: the JSON was already validated at build time and cannot have
//      changed in transit.
//   3. **A reason for all of it to be in the home route's First Load JS**, the
//      one bundle every user pays for before seeing anything.
//
// ## The shape
//
// An index carries what the rails actually render — slug, title, week range,
// and a *precomputed* read time — and nothing else. Bodies stay server-side,
// where `/guias/[slug]` reads them.
//
// `minutes` is precomputed here rather than derived on the client, which is the
// one place this file deviates from `readTime.ts`'s "never stored" rule. That
// rule exists so a figure cannot go stale against an edited body — and it is
// preserved, because the index is **generated from the bodies at build time**
// and `index.test.ts` fails if it drifts. Nobody maintains this number; the
// build does.

/** One row of the index: what a rail renders, and nothing more. */
export interface ArticleIndexEntry {
  slug: string;
  title: string;
  fromWeek?: number;
  toWeek?: number;
  cluster?: string;
  /** Whole minutes, computed from the body at build time. */
  minutes: number;
}

/**
 * Build one index row from a full article.
 *
 * Exported so the generator script and the staleness test derive the row the
 * same way — a second implementation is how the two drift.
 */
export function indexEntryOf(article: Article): ArticleIndexEntry {
  return {
    slug: article.slug,
    title: article.title,
    ...(article.fromWeek === undefined ? {} : { fromWeek: article.fromWeek }),
    ...(article.toWeek === undefined ? {} : { toWeek: article.toWeek }),
    ...(article.cluster === undefined ? {} : { cluster: article.cluster }),
    minutes: readingMinutes(article.html),
  };
}

/** "4 min de lectura", from an index row. The label lives in one place. */
export function indexReadTimeLabel(entry: { minutes: number }): string {
  return `${entry.minutes} min de lectura`;
}
