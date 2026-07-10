import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/seed/articles";
import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";

// SEO surface for the guías + week pages, currently invisible to search
// engines (build spec §5 follow-up). App-shell tool pages that only make
// sense with local on-device data (e.g. /herramientas/*) are intentionally
// excluded — they carry no organic-search value on their own.
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nido.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/conoce`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${appUrl}/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/derechos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/directorio`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${appUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const weekRoutes: MetadataRoute.Sitemap = Array.from(
    { length: MAX_WEEK - MIN_WEEK + 1 },
    (_, i) => MIN_WEEK + i,
  ).map((week) => ({
    url: `${appUrl}/semana/${week}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${appUrl}/guias/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...weekRoutes, ...articleRoutes];
}
