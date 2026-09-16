import { describe, expect, it } from "vitest";

import { RecommendationSchema, type Recommendation } from "../content/schemas";
import { publishedOnly } from "./gate";
import {
  RECOMENDADOS,
  PUBLISHED_RECOMENDADOS,
  recomendadosForStage,
} from "./recomendados";

// U3 — "Recomendados" rail (replaces E4). Same shape of test suite as
// events/directory (BUILD-PLAN Z1): the content itself proves it is real, and
// the gate is proven separately against a synthetic fixture.

describe("recomendados content", () => {
  it("has 8–12 curated resources", () => {
    expect(RECOMENDADOS.length).toBeGreaterThanOrEqual(8);
    expect(RECOMENDADOS.length).toBeLessThanOrEqual(12);
  });

  it("ids are unique", () => {
    const ids = new Set(RECOMENDADOS.map((r) => r.id));
    expect(ids.size).toBe(RECOMENDADOS.length);
  });

  it("ships no invented products — every seeded entry is a recurso", () => {
    for (const r of RECOMENDADOS) {
      expect(r.kind, r.id).toBe("recurso");
      expect(r.priceGs, r.id).toBeUndefined();
    }
  });

  it("every url is https or an in-app path, never bare or http://", () => {
    for (const r of RECOMENDADOS) {
      if (r.url === undefined) continue;
      expect(
        r.url.startsWith("https://") || r.url.startsWith("/"),
        `${r.id}: "${r.url}"`,
      ).toBe(true);
    }
  });

  it("every whatsappNumber is +595 with 9 digits", () => {
    for (const r of RECOMENDADOS) {
      if (r.whatsappNumber === undefined) continue;
      expect(r.whatsappNumber, r.id).toMatch(/^\+595\d{9}$/);
    }
  });

  it("carries exactly one of whatsappNumber or url per entry", () => {
    for (const r of RECOMENDADOS) {
      const hasWa = r.whatsappNumber !== undefined;
      const hasUrl = r.url !== undefined;
      expect(hasWa !== hasUrl, r.id).toBe(true);
    }
  });

  it("everything currently seeded is verified — nothing is filtered by the gate", () => {
    expect(PUBLISHED_RECOMENDADOS).toHaveLength(RECOMENDADOS.length);
  });
});

describe("recomendadosForStage", () => {
  const stage0: Recommendation = RecommendationSchema.parse({
    id: "fixture-stage0",
    kind: "recurso",
    title: "Siempre visible",
    body: "cuerpo de prueba",
    ctaLabel: "Ver",
    url: "/derechos",
    stage: 0,
    priority: 1,
  });
  const stage3: Recommendation = RecommendationSchema.parse({
    id: "fixture-stage3",
    kind: "recurso",
    title: "Solo tercer trimestre",
    body: "cuerpo de prueba",
    ctaLabel: "Ver",
    url: "/emergencia",
    stage: 3,
    priority: 2,
  });
  const fixtures = [stage3, stage0];

  it("with no known trimester, shows only stage 0", () => {
    expect(recomendadosForStage(fixtures, undefined)).toEqual([stage0]);
  });

  it("with a matching trimester, includes both, sorted by priority", () => {
    expect(recomendadosForStage(fixtures, 3)).toEqual([stage0, stage3]);
  });

  it("with a non-matching trimester, still shows only stage 0", () => {
    expect(recomendadosForStage(fixtures, 1)).toEqual([stage0]);
  });
});

describe("the gate itself, proven against a synthetic fixture", () => {
  const real: Recommendation = RecommendationSchema.parse({
    id: "fixture-real",
    kind: "recurso",
    title: "Recurso real",
    body: "cuerpo de prueba",
    ctaLabel: "Ver",
    url: "https://example.com/real",
    stage: 0,
    priority: 1,
  });
  const unverified: Recommendation = RecommendationSchema.parse({
    id: "fixture-unverified",
    kind: "recurso",
    title: "Recurso sin verificar (placeholder)",
    body: "cuerpo de prueba",
    ctaLabel: "Ver",
    url: "https://example.com/placeholder",
    stage: 0,
    priority: 2,
  });

  it("hides an entry marked placeholder and keeps the real one", () => {
    expect(publishedOnly([real, unverified])).toEqual([real]);
  });
});
