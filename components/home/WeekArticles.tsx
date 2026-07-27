import Link from "next/link";
import { ARTICLES } from "@/lib/content";
import { readingTimeLabel } from "@/lib/readingTime";
import type { Article } from "@/lib/types";

// BUILD-PLAN C5/C6 (FEATURE-MAP #14, #15, #17). Articles tied to the week the
// user is actually in, with a read-time label.
//
// Selection is deliberately simple and deterministic: articles tagged with a
// nearby week first, then the rest by recency. No personalisation, no server
// call — the ranking has to work offline like everything else here.

const TONES = ["bg-pastel-rosa", "bg-pastel-celeste", "bg-pastel-salvia", "bg-pastel-lavanda"];

/** Articles most relevant to `week`, nearest tagged week first. */
export function articlesForWeek(week: number, limit = 4): Article[] {
  const withWeek = ARTICLES.filter((a) => a.week !== undefined);
  const withoutWeek = ARTICLES.filter((a) => a.week === undefined);

  const near = [...withWeek].sort(
    (a, b) => Math.abs((a.week ?? 0) - week) - Math.abs((b.week ?? 0) - week),
  );
  const rest = [...withoutWeek].sort((a, b) => b.date.localeCompare(a.date));

  return [...near, ...rest].slice(0, limit);
}

export function WeekArticles({ week }: { week: number }) {
  const articles = articlesForWeek(week);
  if (articles.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Para la semana {week}
        </h2>
        <Link href="/guias" className="text-xs font-extrabold text-terracotta">
          Ver todas
        </Link>
      </div>

      <div className="space-y-2.5">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/guias/${article.slug}`}
            className="flex items-center gap-3 rounded-card border border-line bg-white p-3 transition active:scale-[0.99]"
          >
            <span
              className={`h-14 w-14 shrink-0 rounded-tile ${TONES[index % TONES.length]}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold leading-snug text-ink">
                {article.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Guía · {readingTimeLabel(article.html)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
