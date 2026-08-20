"use client";

import Link from "next/link";

import { ARTICLE_INDEX } from "@/lib/articles/loadIndex";
import { indexReadTimeLabel } from "@/lib/articles/index";
import {
  articlesForReader,
  type PregnancyAnswers,
} from "@/lib/onboarding/personalisation";

// BUILD-PLAN C6 — week-linked article feed + read time (feature map #15, #17).
//
// The home screen already had a "para leer hoy" rail, but it linked to /guias
// three times: the same destination wearing three hats. This replaces it with
// the guías that are actually about this week — bolso del sanatorio at 34,
// trámites at 38, control prenatal at 8 — and falls back to the ones that hold
// for the whole pregnancy rather than showing an empty rail.
//
// K11: this rail reads the build-time **index** (slug · title · range ·
// minutes), not `ARTICLES`. It renders titles and links away, so the article
// bodies — and the zod that validates them — were ~17 kB of the home screen's
// First Load JS doing nothing. Read time is still computed from the body and
// still never hand-maintained; it is computed at build time now, and a test
// fails if the index drifts from the content.
//
// K9-F5: `answers` are onboarding's three optional questions. They break ties
// among guías that are equally about this week — a woman who told us she works
// sees "derechos de la embarazada que trabaja" ahead of "dengue" in a week
// neither is specifically about. With nothing answered this renders exactly
// what it rendered before (`articlesForReader` falls through to
// `articlesForWeek`), which is what makes the questions genuinely skippable.

const TONES = ["bg-pastel-rosa", "bg-pastel-celeste", "bg-pastel-salvia"];

export function WeekArticleFeed({
  week,
  answers = {},
}: {
  week: number;
  answers?: PregnancyAnswers;
}) {
  const articles = articlesForReader(ARTICLE_INDEX, week, answers);
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="para-leer" className="space-y-2.5 pt-1">
      <div className="flex items-baseline justify-between">
        <h2
          id="para-leer"
          className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
        >
          Para leer esta semana
        </h2>
        <Link href="/guias" className="text-[13px] font-extrabold text-terracotta">
          Ver todas
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/guias/${article.slug}`}
            className="block w-[190px] shrink-0 overflow-hidden rounded-card border border-line bg-white transition active:scale-[0.99]"
          >
            <div className={`h-16 ${TONES[index % TONES.length]}`} />
            <div className="p-3">
              <p className="text-sm font-extrabold leading-snug text-ink">
                {article.title}
              </p>
              <p className="mt-1.5 text-[11px] font-bold text-muted">
                {indexReadTimeLabel(article)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
