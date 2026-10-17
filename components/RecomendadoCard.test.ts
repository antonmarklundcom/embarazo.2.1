import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RecommendationSchema, type Recommendation } from "@/lib/content/schemas";
import { RecomendadoCard } from "./RecomendadoCard";

// U3 / KNOWN-ISSUES: internal in-app CTAs open in the same tab; external and
// WhatsApp CTAs keep target="_blank" rel="noopener noreferrer".

function card(overrides: Record<string, unknown>): string {
  const r: Recommendation = RecommendationSchema.parse({
    id: "fixture-card",
    kind: "recurso",
    title: "Recurso de prueba",
    body: "cuerpo de prueba",
    ctaLabel: "Ver",
    stage: 0,
    priority: 1,
    ...overrides,
  });
  return renderToStaticMarkup(createElement(RecomendadoCard, { recomendado: r }));
}

function anchorTag(markup: string): string {
  const tag = markup.match(/<a\s[^>]*>/)?.[0];
  expect(tag).toBeDefined();
  return tag ?? "";
}

describe("RecomendadoCard CTA targets", () => {
  it("opens an internal in-app path in the same tab", () => {
    const tag = anchorTag(card({ url: "/derechos" }));
    expect(tag).toContain('href="/api/v1/go/fixture-card"');
    expect(tag).not.toContain("target=");
    expect(tag).not.toContain("rel=");
  });

  it("keeps a new tab with noopener for an external https url", () => {
    const tag = anchorTag(card({ url: "https://www.mspbs.gov.py/" }));
    expect(tag).toContain('href="/api/v1/go/fixture-card"');
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });

  it("keeps a new tab for a WhatsApp CTA", () => {
    const tag = anchorTag(card({ whatsappNumber: "+595981234567" }));
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });
});
