"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ARTICLES } from "@/lib/seed/articles";
import type { PopularItem } from "@/lib/stats/contentStats";

// BUILD-PLAN C7 — "lo más leído esta semana" (feature map #16).
//
// Aggregate counts over the last seven days, from a table with no identity
// column. It is the one place in the app that says what *other* people are
// reading, which is the closest thing to community this release has.
//
// It renders nothing when there is no data — no database configured, offline,
// or simply a quiet week. An empty "lo más leído" rail on a new app is a
// billboard saying nobody is here.

export function PopularThisWeek() {
  const [popular, setPopular] = useState<PopularItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/stats", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { popular: [] }))
      .then((body: { popular?: PopularItem[] }) => setPopular(body.popular ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // An id we no longer publish (a retired guía) is dropped rather than rendered
  // as a dead link — the counter outlives the content.
  const items = popular
    .map((item) => ARTICLES.find((article) => article.slug === item.contentId))
    .filter((article) => article !== undefined);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="lo-mas-leido" className="space-y-2.5 pt-1">
      <h2
        id="lo-mas-leido"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        Lo más leído esta semana
      </h2>
      <ol className="space-y-2">
        {items.map((article, index) => (
          <li key={article.slug}>
            <Link
              href={`/guias/${article.slug}`}
              className="flex items-center gap-3 rounded-card border border-line bg-white p-3 transition active:scale-[0.99]"
            >
              <span className="text-lg font-black text-pastel-rosa">{index + 1}</span>
              <span className="text-sm font-extrabold leading-snug text-ink">
                {article.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
