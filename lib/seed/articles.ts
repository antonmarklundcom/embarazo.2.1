import type { Article } from "../types";
import { ArticleSchema, validateContentArray } from "../content/schemas";
import rawArticles from "./articles.json";

// 8 genuinely Paraguay-specific guías in es-PY voseo (build spec §5).
// reviewedBy is informational seed metadata; the visible byline on the page
// uses NEXT_PUBLIC_MEDICAL_REVIEWER via <MedicalReviewByline>.
//
// G1 content ops: content lives in articles.json (validated JSON) so it can be
// edited without touching TypeScript. Validated once here, at import time —
// a malformed entry throws immediately with a message naming the file and the
// entry, rather than surfacing as a confusing runtime bug somewhere else.
const { valid, errors } = validateContentArray(
  "lib/seed/articles.json",
  rawArticles as unknown[],
  ArticleSchema,
  (a) => a.slug,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/articles.json:\n${errors.join("\n")}`);
}

export const ARTICLES: Article[] = valid;

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
