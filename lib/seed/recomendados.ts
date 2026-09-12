import type { Recommendation } from "../content/schemas";
import { publishedOnly } from "./gate";
import { RecommendationSchema, validateContentArray } from "../content/schemas";
import rawRecomendados from "./recomendados.json";

// U3 — "Recomendados" rail (replaces E4). Curated free public resources only
// (see docs/HANDOFF-2026-09-06.md §2) — no invented products. Every entry's
// `url`/`whatsappNumber` was verified in the build session; anything that
// could not be verified would carry the word "placeholder" so `publishedOnly`
// hides it, same mechanism as the directory and events (BUILD-PLAN Z1).

const { valid, errors } = validateContentArray(
  "lib/seed/recomendados.json",
  rawRecomendados as unknown[],
  RecommendationSchema,
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/recomendados.json:\n${errors.join("\n")}`,
  );
}

export const RECOMENDADOS: Recommendation[] = valid;

// The rail is also gated by useFlag("recomendados") (default off) — this
// filter only removes unverified/placeholder entries, same as every other
// seed collection.
export const PUBLISHED_RECOMENDADOS: Recommendation[] = publishedOnly(RECOMENDADOS);

/**
 * Recomendados relevant to a stage: `stage: 0` entries always qualify, plus
 * whatever matches the given trimester. `undefined` trimester (no pregnancy
 * date set, or "planeando" mode) shows only the stage-0 entries — nothing
 * trimester-specific is guessed. Sorted by `priority` ascending.
 */
export function recomendadosForStage(
  items: readonly Recommendation[],
  trimester: 1 | 2 | 3 | undefined,
): Recommendation[] {
  return items
    .filter((r) => r.stage === 0 || r.stage === trimester)
    .sort((a, b) => a.priority - b.priority);
}
