import type { Article, FaqEntry } from "../types";
import { APP_NAME } from "../brand";
import { playStoreUrl } from "../rating/playReview";
import { siteGuideUrl } from "../siteLinks";

// Item 7 (night SEO pass, 2026-11-04) — schema.org JSON-LD, built as plain
// data so the shapes are unit-tested; `components/JsonLd.tsx` only prints it.
//
// Honesty rules, the same as the pages': no aggregateRating and no reviews
// (none exist), no named author (the guías are the app's, not a person's), and
// no Article on a page whose canonical is the site — the site owns that page in
// search, and structured data describing it belongs on the site.

type Env = Readonly<Record<string, string | undefined>>;
export type JsonLdData = Record<string, unknown>;

const DEFAULT_APP_URL = "https://app.embarazo.com.py";
const LANGUAGE = "es-PY";

/** App origin without a trailing slash (same fallback as the root layout). */
export function appOrigin(env: Env = process.env): string {
  const raw = env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  return raw.replace(/\/+$/, "");
}

/** `/guias/x` → `https://app…/guias/x`. */
export function absoluteAppUrl(path: string, env: Env = process.env): string {
  return `${appOrigin(env)}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The script body. `JSON.stringify` does not escape `<`, so a `</script>` in
 * any string would close the tag early; `<` is the same character to a
 * JSON parser and inert to the HTML one.
 */
export function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function publisher(env: Env): JsonLdData {
  return {
    "@type": "Organization",
    name: APP_NAME,
    url: appOrigin(env),
    logo: {
      "@type": "ImageObject",
      url: absoluteAppUrl("/icons/icon-512.png", env),
    },
  };
}

/** `/cuenta` — the app itself. The Play listing only once it really exists. */
export function softwareApplicationJsonLd(env: Env = process.env): JsonLdData {
  const origin = appOrigin(env);
  const play = playStoreUrl(env.NEXT_PUBLIC_PLAY_STORE_URL);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "HealthApplication",
    operatingSystem: "Android, Web",
    url: origin,
    inLanguage: LANGUAGE,
    offers: { "@type": "Offer", price: "0", priceCurrency: "PYG" },
    ...(play ? { installUrl: play, sameAs: [play] } : {}),
  };
}

/** `/preguntas` — exactly the entries the page renders, in its order. */
export function faqPageJsonLd(entries: readonly FaqEntry[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: LANGUAGE,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/**
 * `/guias/[slug]` — an Article only for a guía whose canonical is the app.
 * `null` for a guía with a site twin (`siteGuideUrl`): the app page is not the
 * one search shows, so it does not describe itself as the article.
 *
 * Dates: the record has one, `date`, so it is `datePublished`; there is no
 * modification date to report and none is made up.
 */
export function guideArticleJsonLd(
  article: Pick<Article, "slug" | "title" | "excerpt" | "date">,
  env: Env = process.env,
): JsonLdData | null {
  if (siteGuideUrl(article.slug, env) !== null) return null;
  const url = absoluteAppUrl(`/guias/${article.slug}`, env);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    inLanguage: LANGUAGE,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: APP_NAME, url: appOrigin(env) },
    publisher: publisher(env),
  };
}
