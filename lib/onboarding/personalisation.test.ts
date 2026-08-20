import { describe, it, expect } from "vitest";

import { CHECKLISTS } from "@/lib/checklists";
import { WORK_SITUATIONS } from "@/lib/derechos";
import { ARTICLES } from "@/lib/seed/articles";
import { articlesForWeek } from "@/lib/articles/forWeek";
import type { Article } from "@/lib/types";
import {
  CARE_SETTINGS,
  articlesForReader,
  clusterBoost,
  defaultWorkSituation,
  isUnanswered,
  personaliseChecklists,
  type PregnancyAnswers,
} from "./personalisation";

// K9-F5. The property under test throughout is the one a component test could
// never reach: that the three questions onboarding now asks actually change
// something, and that skipping them changes nothing at all.

const NOTHING: PregnancyAnswers = {};

function article(slug: string, cluster: string, over: Partial<Article> = {}): Article {
  return {
    slug,
    title: slug,
    excerpt: "",
    date: "2026-01-01",
    author: "Mi Bebé",
    cluster,
    html: "<p>x</p>",
    ...over,
  } as Article;
}

describe("isUnanswered", () => {
  it("distinguishes 'she said no' from 'she did not say'", () => {
    expect(isUnanswered(NOTHING)).toBe(true);
    expect(isUnanswered({ firstPregnancy: false })).toBe(false);
    expect(isUnanswered({ careSetting: "publico" })).toBe(false);
    expect(isUnanswered({ workSituation: "no-trabaja" })).toBe(false);
  });
});

describe("defaultWorkSituation", () => {
  it("hands /derechos the answer she already gave", () => {
    expect(defaultWorkSituation({ workSituation: "ips" })).toBe("ips");
  });

  it("keeps the page asking when she skipped", () => {
    // Null, not a guess. Defaulting somebody to "ips" would show her a
    // subsidio she may have no claim to.
    expect(defaultWorkSituation(NOTHING)).toBeNull();
  });

  it("offers exactly the situations /derechos knows about", () => {
    for (const situation of WORK_SITUATIONS) {
      expect(defaultWorkSituation({ workSituation: situation.key })).toBe(
        situation.key,
      );
    }
  });
});

describe("personaliseChecklists", () => {
  const keys = (groups: { items: { key: string }[] }[]) =>
    groups.flatMap((g) => g.items.map((i) => i.key));

  it("drops the hedge for somebody whose condition we know", () => {
    for (const answers of [
      { careSetting: "ips" },
      { workSituation: "ips" },
    ] as PregnancyAnswers[]) {
      const items = personaliseChecklists(CHECKLISTS, answers).flatMap(
        (g) => g.items,
      );
      expect(items.find((i) => i.key === "bolso-seguro")!.label).toBe(
        "Carné de IPS",
      );
      expect(items.find((i) => i.key === "tramite-ips")!.label).toBe(
        "Anotar al bebé como beneficiario en IPS",
      );
    }
  });

  it("keeps the hedge for everybody else", () => {
    for (const answers of [
      NOTHING,
      { careSetting: "privado" },
      { workSituation: "no-trabaja" },
    ] as PregnancyAnswers[]) {
      const items = personaliseChecklists(CHECKLISTS, answers).flatMap(
        (g) => g.items,
      );
      expect(items.find((i) => i.key === "bolso-seguro")!.label).toContain(
        "(si tenés)",
      );
    }
  });

  it("never adds or removes an item, whatever she answered", () => {
    // The keys are shared state: `lib/sharing/fields.ts` lets a pareja be
    // assigned one by key. A personalisation that dropped `tramite-ips` for a
    // woman who does not aporta would silently orphan her partner's task.
    const before = keys(CHECKLISTS);
    for (const careSetting of [undefined, ...CARE_SETTINGS.map((c) => c.key)]) {
      for (const workSituation of [
        undefined,
        ...WORK_SITUATIONS.map((w) => w.key),
      ]) {
        expect(
          keys(personaliseChecklists(CHECKLISTS, { careSetting, workSituation })),
        ).toEqual(before);
      }
    }
  });

  it("does not mutate the catalogue", () => {
    const original = JSON.stringify(CHECKLISTS);
    personaliseChecklists(CHECKLISTS, { careSetting: "ips" });
    expect(JSON.stringify(CHECKLISTS)).toBe(original);
  });
});

describe("clusterBoost", () => {
  it("lifts the procedural guías for a first-time mother", () => {
    expect(clusterBoost("logistica", { firstPregnancy: true })).toBeGreaterThan(
      clusterBoost("logistica", { firstPregnancy: false }),
    );
  });

  it("lifts derechos for somebody who works, and demotes it for somebody who does not", () => {
    expect(clusterBoost("derechos", { workSituation: "ips" })).toBeGreaterThan(0);
    expect(clusterBoost("derechos", { workSituation: "sin-ips" })).toBeGreaterThan(0);
    // The one shipped derechos guía is "la embarazada que trabaja". For a
    // woman who told us she does not, leaving it at neutral would mean the
    // question changed nothing for a third of the people who answer it.
    expect(clusterBoost("derechos", { workSituation: "no-trabaja" })).toBeLessThan(0);
  });

  it("is silent about clusters and answers it knows nothing about", () => {
    expect(clusterBoost("salud", NOTHING)).toBe(0);
    expect(clusterBoost(undefined, { firstPregnancy: true })).toBe(0);
    expect(clusterBoost("no-such-cluster", { workSituation: "ips" })).toBe(0);
  });
});

describe("articlesForReader", () => {
  it("is exactly articlesForWeek when she answered nothing", () => {
    // The questions are skippable. Skipping has to leave the app identical to
    // the one that shipped before this feature.
    for (let week = 1; week <= 42; week += 1) {
      expect(articlesForReader(ARTICLES, week, NOTHING)).toEqual(
        articlesForWeek(ARTICLES, week),
      );
    }
  });

  it("still answers with the same number of guías", () => {
    for (let week = 1; week <= 42; week += 1) {
      expect(articlesForReader(ARTICLES, week, { workSituation: "ips" })).toHaveLength(
        articlesForWeek(ARTICLES, week).length,
      );
    }
  });

  it("puts the boosted cluster first among guías that are equally about this week", () => {
    const catalogue = [
      article("a", "salud"),
      article("b", "alimentacion"),
      article("c", "derechos"),
      article("d", "logistica"),
    ];
    const ranked = articlesForReader(catalogue, 20, { workSituation: "sin-ips" }, 3);
    expect(ranked[0]!.slug).toBe("c");
  });

  it("never outranks the week itself", () => {
    // Week 34 is what "qué llevar al sanatorio" is *for*. No answer she gives
    // may push a guía about her week behind a general one.
    const catalogue = [
      article("general-derechos", "derechos"),
      article("bolso", "logistica", { fromWeek: 34, toWeek: 36 }),
    ];
    const ranked = articlesForReader(catalogue, 35, { workSituation: "ips" }, 2);
    expect(ranked[0]!.slug).toBe("bolso");
  });

  it("breaks ties on the file's order, so a content editor still decides", () => {
    const catalogue = [
      article("first", "salud"),
      article("second", "salud"),
      article("third", "salud"),
    ];
    expect(
      articlesForReader(catalogue, 20, { firstPregnancy: true }, 3).map((a) => a.slug),
    ).toEqual(["first", "second", "third"]);
  });

  it("only ever reorders what she could already have reached", () => {
    // Nothing is hidden and nothing is invented: the personalised rail is
    // always a subset of the week's candidates.
    const week = 12;
    const candidates = new Set(
      articlesForWeek(ARTICLES, week, ARTICLES.length).map((a) => a.slug),
    );
    for (const answers of [
      { firstPregnancy: true },
      { firstPregnancy: false, workSituation: "no-trabaja" as const },
      { careSetting: "publico" as const, workSituation: "ips" as const },
    ]) {
      for (const found of articlesForReader(ARTICLES, week, answers)) {
        expect(candidates.has(found.slug)).toBe(true);
      }
    }
  });
});
