import type { ChecklistGroup } from "@/lib/checklists";
import type { WorkSituation } from "@/lib/derechos";
import {
  articlesForWeek,
  weekSpan,
  WEEK_FEED_SIZE,
  type RankableArticle,
} from "@/lib/articles/forWeek";

// K9-F5 (docs/FABLE-PLAN-2026-08.md §3) — the three onboarding answers, and
// everything they are allowed to change.
//
// The feature is "onboarding depth", but depth is only worth the friction if
// the answers *do* something the user can see. So this module is the whole
// contract: three optional answers in, a personalised benefits default, a
// personalised checklist wording and a personalised article order out. It is
// pure and unit-tested, because "asking a question and then ignoring it" is a
// failure that no component test would ever catch.
//
// Three rules hold across everything below, and each of them is a decision:
//
//  1. **Unanswered is a first-class answer.** Every field is optional and every
//     function must behave exactly as the app did before K9-F5 when they are
//     all absent. The questions are skippable in the flow, so "skipped" cannot
//     be a degraded state.
//  2. **Personalisation reorders and rewords. It never removes.** Checklist
//     item keys are shared state (`lib/sharing/fields.ts` lets a pareja be
//     assigned one), and an article hidden because of an answer is a guía the
//     user can no longer find. Hiding is the version of this feature that
//     loses information; wording and order is the version that adds it.
//  3. **Week relevance still wins.** A woman in week 34 sees "qué llevar al
//     sanatorio" first whatever she answered. These answers break ties among
//     guías that are equally about her week — they do not outrank the week.

/** Where she is going to be seen — which is not the same as who pays for it. */
export type CareSetting = "ips" | "publico" | "privado";

export const CARE_SETTINGS: { key: CareSetting; label: string; hint: string }[] = [
  {
    key: "ips",
    label: "En IPS",
    hint: "Con tu seguro social o el de tu pareja",
  },
  {
    key: "publico",
    label: "En el sistema público",
    hint: "Hospital, centro o puesto de salud del MSPBS",
  },
  {
    key: "privado",
    label: "En un sanatorio privado",
    hint: "Con seguro médico privado o pagando la consulta",
  },
];

/**
 * What onboarding asked, as stored on the profile row.
 *
 * Deliberately its own interface rather than `Pick<Profile, …>`: this is the
 * *question set*, and it is imported by pure functions that must not depend on
 * Dexie. `Profile` structurally satisfies it, which is the whole point.
 */
export interface PregnancyAnswers {
  /** ¿Es tu primer embarazo? Absent means she did not say. */
  firstPregnancy?: boolean;
  /** ¿Dónde te vas a atender? */
  careSetting?: CareSetting;
  /** ¿Trabajás? — the same three options `/derechos` has always asked. */
  workSituation?: WorkSituation;
}

/** True when nothing was answered, i.e. the app should behave as it always did. */
export function isUnanswered(answers: PregnancyAnswers): boolean {
  return (
    answers.firstPregnancy === undefined &&
    answers.careSetting === undefined &&
    answers.workSituation === undefined
  );
}

// ---------------------------------------------------------------------------
// /derechos
// ---------------------------------------------------------------------------

/**
 * The work situation `/derechos` should start on, or null to keep asking.
 *
 * `/derechos` asked this question on every single visit and threw the answer
 * away on every single exit. Onboarding now asks it once, so the page starts
 * on her answer — still shown as a selected, changeable choice rather than
 * silently applied, because "trabajo sin IPS" today can be "trabajo y aporto"
 * next month and she must be able to say so without reinstalling anything.
 */
export function defaultWorkSituation(
  answers: PregnancyAnswers,
): WorkSituation | null {
  return answers.workSituation ?? null;
}

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

/**
 * Rewrite the conditional labels for somebody whose condition we now know.
 *
 * Two rows in `lib/checklists.ts` hedge — "Carné de IPS o seguro (si tenés)",
 * "Anotar al bebé como beneficiario en IPS (si corresponde)" — because the
 * catalogue could not know. For a woman who told us she is seen at IPS, or who
 * aporta, the hedge is now noise on a list she reads while packing a bag at 3am.
 *
 * Keys are never touched. A pareja may already have `bolso-seguro` assigned
 * (`lib/sharing/fields.ts`), and a personalisation that renamed a key would
 * silently orphan that assignment.
 */
export function personaliseChecklists(
  groups: readonly ChecklistGroup[],
  answers: PregnancyAnswers,
): ChecklistGroup[] {
  const hasIps =
    answers.careSetting === "ips" || answers.workSituation === "ips";
  if (!hasIps) return groups.map((group) => ({ ...group }));

  const REWRITES: Record<string, string> = {
    "bolso-seguro": "Carné de IPS",
    "tramite-ips": "Anotar al bebé como beneficiario en IPS",
  };

  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      REWRITES[item.key] ? { ...item, label: REWRITES[item.key]! } : item,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Article ordering
// ---------------------------------------------------------------------------

/**
 * How much this cluster is worth to this reader. Higher sorts earlier.
 *
 * Clusters, not slugs: a boost keyed on `derechos-embarazada-que-trabaja`
 * would be a rule about one file that a content editor could delete without
 * noticing. Clusters are the seed's own vocabulary and survive editing.
 *
 * The negative case matters as much as the positive one. "Derechos de la
 * embarazada que trabaja" is not a hedged fit for somebody who told us she
 * does not work — it is the wrong article, and leaving it at neutral would
 * mean the question changed nothing for a third of the people who answer it.
 */
export function clusterBoost(
  cluster: string | undefined,
  answers: PregnancyAnswers,
): number {
  let score = 0;

  if (answers.firstPregnancy === true) {
    // She has never packed the bag, never read a contraction, never been
    // asked for the carné at a window. Everything procedural is new.
    if (cluster === "logistica") score += 2;
    if (cluster === "salud") score += 1;
  }
  if (answers.firstPregnancy === false) {
    // She has done this. What changes between pregnancies is the paperwork
    // and the law, not what a contraction feels like.
    if (cluster === "tramites") score += 1;
  }

  if (answers.workSituation === "ips" || answers.workSituation === "sin-ips") {
    if (cluster === "derechos") score += 2;
    if (cluster === "tramites") score += 1;
  }
  if (answers.workSituation === "no-trabaja") {
    // Not hidden — demoted. Her partner's job may still make it relevant,
    // and /guias lists everything regardless.
    if (cluster === "derechos") score -= 2;
  }

  return score;
}

/**
 * The home rail's guías, ranked for this reader.
 *
 * Built on top of `articlesForWeek` rather than replacing it: that function
 * owns "which guías are about this week, most specific first", and F5 has no
 * business re-deciding it. The personal boost is applied *within* the ranking
 * it produces, over a widened candidate set — take more than we will show,
 * reorder those, then cut. Widening is what makes the boost visible at all:
 * ranking three articles that were already chosen can only ever shuffle three
 * articles.
 *
 * With no answers this is `articlesForWeek` exactly, asserted by test.
 */
export function articlesForReader<T extends RankableArticle>(
  articles: readonly T[],
  week: number,
  answers: PregnancyAnswers,
  limit: number = WEEK_FEED_SIZE,
): T[] {
  if (isUnanswered(answers)) return articlesForWeek(articles, week, limit);

  const candidates = articlesForWeek(articles, week, limit * 2);
  return candidates
    .map((article, index) => ({ article, index }))
    .sort(
      (a, b) =>
        // Week specificity first, and it is not negotiable: a guía about week
        // 34 leads in week 34 no matter what she answered. The boost sorts the
        // guías that are *equally* about her week — which, for most of the
        // pregnancy, is all of them.
        weekSpan(a.article) - weekSpan(b.article) ||
        clusterBoost(b.article.cluster, answers) -
          clusterBoost(a.article.cluster, answers) ||
        // Then the content editor's file order, exactly as before.
        a.index - b.index,
    )
    .slice(0, limit)
    .map((entry) => entry.article);
}
