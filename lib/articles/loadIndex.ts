import type { ArticleIndexEntry } from "./index";
import raw from "./index.json";

// K11 — the generated index, typed.
//
// Separate from `lib/articles/index.ts` so that importing the *data* does not
// drag in `readTime.ts` and `indexEntryOf`, which exist for the generator and
// the staleness test and have no business in a browser bundle. This module is
// what client components import, and it is a JSON file and a cast.
//
// No zod here, deliberately, and it is the point of the exercise: `index.json`
// is generated from already-validated content by `scripts/build-article-index.mts`
// and checked by `lib/articles/index.test.ts`. Re-validating it in the browser
// would ship the schema module to every user to re-prove something the build
// proved — which is exactly the cost this file exists to remove.

export const ARTICLE_INDEX = raw as ArticleIndexEntry[];
