"use client";

import Link from "next/link";

import { ARTICLES } from "@/lib/seed/articles";
import { articlesForWeek } from "@/lib/articles/forWeek";
import { readTimeLabel } from "@/lib/articles/readTime";

// BUILD-PLAN C6 — week-linked article feed + read time (feature map #15, #17).
//
// The home screen already had a "para leer hoy" rail, but it linked to /guias
// three times: the same destination wearing three hats. This replaces it with
// the guías that are actually about this week — bolso del sanatorio at 34,
// trámites at 38, control prenatal at 8 — and falls back to the ones that hold
// for the whole pregnancy rather than showing an empty rail.
//
// Read time is computed from the body, never stored (`lib/articles/readTime.ts`),
// so it cannot go stale when somebody edits an article.

const TONES = ["bg-pastel-rosa", "bg-pastel-celeste", "bg-pastel-salvia"];

export function WeekArticleFeed({ week }: { week: number }) {
  const articles = articlesForWeek(ARTICLES, week);
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
                {readTimeLabel(article.html)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
