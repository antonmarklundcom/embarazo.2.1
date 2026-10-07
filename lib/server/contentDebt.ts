import "server-only";

import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  summariseCollection,
  type CollectionDebt,
} from "@/lib/content/reviewDebt";
import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";
import {
  foodClinicalText,
  foodContentId,
  insightClinicalText,
  insightContentId,
  obstetraContentId,
  reviewFor,
} from "@/lib/content/approvals";
import { REVIEW_REGISTRY } from "@/lib/seed/approvals";

import directoryData from "@/lib/seed/directory.json";
import placementsData from "@/lib/seed/placements.json";
import eventsData from "@/lib/seed/events.json";
import pricesData from "@/lib/seed/prices.json";
import foodData from "@/lib/seed/food.json";
import videosData from "@/lib/seed/videos.json";
import namesData from "@/lib/seed/names.json";
import faqData from "@/lib/seed/faq.json";
import insightsData from "@/lib/seed/insights.json";
import limbSizesData from "@/lib/seed/limbSizes.json";
import obstetraNotesData from "@/lib/seed/obstetraNotes.json";
import perspectivesData from "@/lib/seed/perspectives.json";
import weeklyLinesData from "@/lib/seed/weeklyLines.json";
import ejerciciosData from "@/lib/seed/ejercicios.json";
import recomendadosData from "@/lib/seed/recomendados.json";

// FABLE-PLAN §5 D4 — which collections the review-debt page reports on.
//
// The raw JSON is read here rather than the `PUBLISHED_*` exports, because the
// interesting number is the one the app throws away: `PUBLISHED_NAMES.length`
// is what a user sees, and this page is about the difference between that and
// what is in the file.
//
// Adding a seed file means adding a row here. That is on purpose and it is the
// same bet the pinned lists elsewhere make (`TABLE_DISPOSITION`,
// `ADMIN_ACTIONS`): a new content collection that nobody lists is a surface
// that can go dark without anyone noticing, and the cheapest moment to decide
// what it means is the moment it is added. `contentDebt.test.ts` fails when a
// `lib/seed/*.json` file exists with no row.

/**
 * Seed files that are not content collections and have no debt to report.
 *
 * `comparisons.json` (U7) is here rather than as a row because it carries no
 * debt to report: it is the real-world size of the week's fruit, complete for
 * every week 3–42 by test (`lib/seed/comparisons.test.ts`), with no placeholder
 * gate and no surface that can go dark. A debt row for it would read 0% forever
 * and teach a founder to skim the list.
 */
export const NOT_A_COLLECTION = new Set([
  "articles.json",
  "comparisons.json",
  // F22 — the review registry itself, not content: who may be named and which
  // exact texts each of them approved. Its effect shows up in the rows below.
  "reviewers.json",
  "approvals.json",
]);

/**
 * F22 — the review gate for collections whose entries carry no `reviewedBy` of
 * their own (obstetra notes, insight templates) or whose `reviewedBy` is only a
 * claim (food). Each entry is counted as reviewed exactly when the app would
 * render it as reviewed: a current approval of its text in
 * `lib/seed/approvals.json`. Reported through the same `reviewedBy` field
 * `summariseCollection` already reads, so the report cannot drift from the gate.
 */
function withApproval(
  list: unknown[],
  contentIdOf: (entry: Record<string, unknown>) => string,
  textOf: (entry: Record<string, unknown>) => string,
  claimOf?: (entry: Record<string, unknown>) => string | undefined,
): unknown[] {
  return list.map((raw) => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const review = reviewFor(REVIEW_REGISTRY, contentIdOf(entry), textOf(entry));
    const claim = claimOf?.(entry);
    const reviewed = review && (claimOf === undefined || claim === review.reviewerName);
    return { ...entry, reviewedBy: reviewed ? review.reviewerName : undefined };
  });
}

function entries(value: unknown, key?: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (key && value && typeof value === "object") {
    const inner = (value as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/**
 * Every gated content collection, with where it renders.
 *
 * `surface` is the part a founder reads first: "Directorio · /directorio" says
 * which screen is empty, which is the actual complaint a user would make.
 */
export function collectionDebt(): CollectionDebt[] {
  return [
    summariseCollection({
      label: "Directorio",
      surface: "/directorio",
      file: "lib/seed/directory.json",
      entries: entries(directoryData, "listings"),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Patrocinios",
      surface: "Inicio · bloque de recursos",
      file: "lib/seed/placements.json",
      entries: entries(placementsData, "placements"),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Eventos",
      surface: "/eventos",
      file: "lib/seed/events.json",
      entries: entries(eventsData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Precios",
      surface: "/herramientas/precios",
      file: "lib/seed/prices.json",
      entries: entries(pricesData),
      gates: "both",
    }),
    summariseCollection({
      label: "¿Puedo comer…?",
      surface: "/herramientas/comer",
      file: "lib/seed/food.json",
      entries: withApproval(
        entries(foodData),
        (entry) => foodContentId(String(entry.id)),
        (entry) => foodClinicalText(entry as Parameters<typeof foodClinicalText>[0]),
        (entry) => (typeof entry.reviewedBy === "string" ? entry.reviewedBy : undefined),
      ),
      gates: "unreviewed",
    }),
    summariseCollection({
      label: "Videos",
      surface: "/guias/videos",
      file: "lib/seed/videos.json",
      entries: entries(videosData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Nombres",
      surface: "/herramientas/nombres",
      file: "lib/seed/names.json",
      entries: entries(namesData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Preguntas frecuentes",
      surface: "/preguntas",
      file: "lib/seed/faq.json",
      entries: entries(faqData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Frases de patrones (F3)",
      surface: "/herramientas/sintomas",
      file: "lib/seed/insights.json",
      entries: withApproval(
        entries(insightsData),
        (entry) => insightContentId(String(entry.id)),
        (entry) => insightClinicalText({ line: String(entry.line), hint: String(entry.hint) }),
      ),
      gates: "both",
    }),
    summariseCollection({
      label: "Tamaños de manos y pies",
      surface: "/semana/[n]",
      file: "lib/seed/limbSizes.json",
      entries: entries(limbSizesData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Notas de la obstetra",
      surface: "/semana/[n]",
      file: "lib/seed/obstetraNotes.json",
      entries: withApproval(
        entries(obstetraNotesData),
        (entry) => obstetraContentId(Number(entry.week)),
        (entry) => String(entry.note),
      ),
      gates: "both",
    }),
    summariseCollection({
      label: "Para tu pareja / tu familia",
      surface: "Inicio del acompañante",
      file: "lib/seed/perspectives.json",
      entries: entries(perspectivesData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Frase de la semana",
      surface: "Inicio · héroe semanal",
      file: "lib/seed/weeklyLines.json",
      entries: entries(weeklyLinesData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Ejercicios",
      surface: "/herramientas/ejercicios",
      file: "lib/seed/ejercicios.json",
      entries: entries(ejerciciosData),
      gates: "placeholder",
    }),
    summariseCollection({
      label: "Recomendados",
      surface: "/recomendados",
      file: "lib/seed/recomendados.json",
      entries: entries(recomendadosData),
      gates: "placeholder",
    }),
  ];
}

export interface WeekRenderDebt {
  total: number;
  present: number;
  /** The first few weeks with no render, for a founder who wants to start. */
  missingSample: number[];
}

/**
 * The weekly hero renders — the one piece of content debt that is not JSON.
 *
 * It is on this page because it is the most expensive missing content in the
 * app and it does not look like missing content: `WeekHeroImage` falls back to
 * a coloured block with the week number, which renders fine and therefore
 * never complains. It is also the home screen's LCP element, so every missing
 * render is a slower first paint on a mid-range Android over mobile data.
 *
 * Counted from the filesystem rather than a manifest, because the founder
 * "adds" one by dropping a file into `public/assets/semanas/` and nothing
 * should have to be edited afterwards.
 */
export function weekRenderDebt(): WeekRenderDebt {
  const dir = join(process.cwd(), "public", "assets", "semanas");
  let files: string[] = [];
  try {
    files = readdirSync(dir);
  } catch {
    // No directory at all is the same report as an empty one.
    files = [];
  }

  const present = new Set(
    files
      .map((name) => /^bebe-(\d{1,2})\.webp$/.exec(name)?.[1])
      .filter((week): week is string => Boolean(week))
      .map(Number),
  );

  const missing: number[] = [];
  for (let week = MIN_WEEK; week <= MAX_WEEK; week += 1) {
    if (!present.has(week)) missing.push(week);
  }

  return {
    total: MAX_WEEK - MIN_WEEK + 1,
    present: MAX_WEEK - MIN_WEEK + 1 - missing.length,
    missingSample: missing.slice(0, 8),
  };
}
