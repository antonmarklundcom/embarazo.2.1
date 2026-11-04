import { describe, expect, it } from "vitest";

import { APP_NAME } from "../brand";
import { ARTICLES } from "../seed/articles";
import { faqFor } from "../seed/faq";
import { GUIDE_TO_SITE_PATH } from "../siteLinks";
import {
  absoluteAppUrl,
  appOrigin,
  faqPageJsonLd,
  guideArticleJsonLd,
  serializeJsonLd,
  softwareApplicationJsonLd,
} from "./jsonLd";

const ENV = { NEXT_PUBLIC_APP_URL: "https://app.example.test/" };
const PLAY = "https://play.google.com/store/apps/details?id=py.com.embarazo.app";

describe("appOrigin", () => {
  it("falls back to the production origin and drops trailing slashes", () => {
    expect(appOrigin({})).toBe("https://app.embarazo.com.py");
    expect(appOrigin(ENV)).toBe("https://app.example.test");
    expect(absoluteAppUrl("/icons/icon-512.png", ENV)).toBe(
      "https://app.example.test/icons/icon-512.png",
    );
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so content cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("softwareApplicationJsonLd", () => {
  it("describes the free web/Android app without ratings or reviews", () => {
    const ld = softwareApplicationJsonLd(ENV);
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: APP_NAME,
      applicationCategory: "HealthApplication",
      operatingSystem: "Android, Web",
      url: "https://app.example.test",
      inLanguage: "es-PY",
      offers: { "@type": "Offer", price: "0", priceCurrency: "PYG" },
    });
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("review");
  });

  it("links the Play listing only when it is a real listing URL", () => {
    const withPlay = softwareApplicationJsonLd({ ...ENV, NEXT_PUBLIC_PLAY_STORE_URL: PLAY });
    expect(withPlay.installUrl).toBe(PLAY);
    expect(withPlay.sameAs).toEqual([PLAY]);

    const typo = softwareApplicationJsonLd({ ...ENV, NEXT_PUBLIC_PLAY_STORE_URL: "https://example.com/app" });
    expect(typo).not.toHaveProperty("installUrl");
    expect(typo).not.toHaveProperty("sameAs");
  });
});

describe("faqPageJsonLd", () => {
  it("maps each entry to a Question with its accepted Answer, in order", () => {
    const entries = faqFor(["privacidad", "cuenta", "app", "salud"]);
    expect(entries.length).toBeGreaterThan(0);
    const ld = faqPageJsonLd(entries);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toEqual(
      entries.map((e) => ({
        "@type": "Question",
        name: e.question,
        acceptedAnswer: { "@type": "Answer", text: e.answer },
      })),
    );
  });
});

describe("guideArticleJsonLd", () => {
  it("omits Article for every guía whose canonical is the site", () => {
    const mapped = ARTICLES.filter((a) => a.slug in GUIDE_TO_SITE_PATH);
    expect(mapped.length).toBeGreaterThan(0);
    for (const article of mapped) expect(guideArticleJsonLd(article, ENV)).toBeNull();
  });

  it("builds an Article on the app URL for a guía without a site twin", () => {
    const article = {
      slug: "guia-solo-app",
      title: "Una guía <solo> en la app",
      excerpt: "Resumen.",
      date: "2026-10-01",
    };
    const ld = guideArticleJsonLd(article, ENV)!;
    const url = "https://app.example.test/guias/guia-solo-app";
    expect(ld).toMatchObject({
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      datePublished: "2026-10-01",
      inLanguage: "es-PY",
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: APP_NAME },
      publisher: {
        "@type": "Organization",
        name: APP_NAME,
        logo: { "@type": "ImageObject", url: "https://app.example.test/icons/icon-512.png" },
      },
    });
    expect(ld).not.toHaveProperty("dateModified");
    expect(ld).not.toHaveProperty("reviewedBy");
    expect(serializeJsonLd(ld)).not.toContain("<");
  });
});
