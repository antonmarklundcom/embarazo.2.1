"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ARTICLES } from "@/lib/seed/articles";
import {
  weekBucket,
  type PopularByBucket,
  type PopularItem,
} from "@/lib/stats/contentStats";
import { useProfile } from "@/lib/useProfile";

// BUILD-PLAN C7 — "lo más leído esta semana" (feature map #16).
// **Amended by K5 (§7).**
//
// Aggregate counts over the last seven days, from a table with no identity
// column. It is the one place in the app that says what *other* people are
// reading, which is the closest thing to community this release has.
//
// K5 made "esta semana" mean the pregnancy week again rather than the last
// seven days. The **selection happens here, on the device**: the server sends
// the top N for every week bucket under one parameterless URL, so there is one
// cache key for everybody and no week in any request line. Picking a row out of
// a payload the reader already has is the cheapest possible personalisation and
// the only one that costs nothing in privacy.
//
// It renders nothing when there is no data — no database configured, offline,
// or simply a quiet week. An empty "lo más leído" rail on a new app is a
// billboard saying nobody is here.

export function PopularThisWeek() {
  const [buckets, setBuckets] = useState<PopularByBucket[]>([]);
  const profile = useProfile();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/stats", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { popular: [] }))
      .then((body: { popular?: PopularByBucket[] }) =>
        setBuckets(body.popular ?? []),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Her own bucket if it has anything to say, otherwise everybody's (bucket 0).
  // A bucket with two rows in it would present one woman's afternoon as what
  // everyone is reading, so `popularContent` only fills a bucket that has
  // content and this falls back rather than showing a thin list.
  const mine = weekBucket(profile.week);
  const popular: PopularItem[] =
    buckets.find((entry) => entry.bucket === mine)?.items ??
    buckets.find((entry) => entry.bucket === 0)?.items ??
    [];

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
