import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/seed/articles";
import { siteGuideUrl } from "@/lib/siteLinks";

// The app's own search surface. Week pages, guías with a site twin and the
// old /conoce landing are left out: embarazo.com.py is the indexable version
// of each (their canonicals point there — lib/siteLinks.ts), and /conoce
// 301s to the site. App-shell tool pages that only make sense with local
// on-device data (e.g. /herramientas/*) are excluded as well — they carry no
// organic-search value on their own.
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mibebe.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/derechos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/directorio`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    // U3: the flag is runtime, the build is static — listed unconditionally,
    // same as /directorio (also flag/content-gated at render time).
    { url: `${appUrl}/recomendados`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${appUrl}/preguntas`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${appUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    // Play requires this URL to be publicly reachable; it is also the one page
    // somebody may need to find from a search engine rather than from the app.
    { url: `${appUrl}/borrar-cuenta`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = ARTICLES.filter(
    (a) => siteGuideUrl(a.slug) === null,
  ).map((a) => ({
    url: `${appUrl}/guias/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
