"use client";

import Link from "next/link";

import { EditorialCard, EditorialRow } from "@/components/EditorialCard";
import { ARTICLE_INDEX } from "@/lib/articles/loadIndex";
import { indexReadTimeLabel } from "@/lib/articles/index";
import {
  articlesForReader,
  type PregnancyAnswers,
} from "@/lib/onboarding/personalisation";

// Keep week filtering and optional-answer ranking on the lightweight index:
// article bodies and their content validation stay out of the home bundle.
//
// `layout="list"`: thumbnail rows inside Hoy's "Qué esperar" card (Flo
// benchmark, 2026-10-17). Same region name, same links, same read times.
export function WeekArticleFeed({
  week,
  answers = {},
  layout = "shelf",
}: {
  week: number;
  answers?: PregnancyAnswers;
  layout?: "shelf" | "list";
}) {
  const articles = articlesForReader(ARTICLE_INDEX, week, answers);
  if (articles.length === 0) return null;

  if (layout === "list") {
    return (
      <section aria-labelledby="para-leer" className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h3 id="para-leer" className="text-base font-extrabold leading-snug text-ink">
            Para leer esta semana
          </h3>
          <Link href="/guias" className="flex min-h-11 shrink-0 items-center text-sm font-bold text-petrol underline-offset-4 hover:underline">
            Ver todas
          </Link>
        </div>
        <ul aria-label="Para leer esta semana" className="divide-y divide-line/70">
          {articles.map((article) => (
            <li key={article.slug} className="py-1">
              <EditorialRow slug={article.slug} title={article.title} readTime={indexReadTimeLabel(article)} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="para-leer" className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-4">
        <h2 id="para-leer" className="text-lg font-extrabold leading-snug text-ink">
          Para leer esta semana
        </h2>
        <Link
          href="/guias"
          className="flex min-h-11 shrink-0 items-center text-sm font-bold text-petrol underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol"
        >
          Ver todas
        </Link>
      </div>
      <p id="para-leer-instrucciones" className="sr-only sm:hidden">
        Deslizá para ver las guías. Con teclado, enfocá la lista y usá las flechas.
      </p>
      <ul
        aria-label="Para leer esta semana"
        aria-describedby="para-leer-instrucciones"
        tabIndex={0}
        className="-mx-1 flex gap-4 overflow-x-auto rounded-[22px] px-1 pb-4 pt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:grid sm:grid-cols-2 xl:grid-cols-3"
      >
        {articles.map((article) => (
          <li key={article.slug} className="w-[min(74vw,17rem)] shrink-0 sm:w-auto">
            <EditorialCard
              slug={article.slug}
              title={article.title}
              readTime={indexReadTimeLabel(article)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
