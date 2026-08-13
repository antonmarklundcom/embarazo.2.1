import { describe, expect, it } from "vitest";

import { articlesForWeek, isWeekSpecific } from "./forWeek";
import { ARTICLES } from "../seed/articles";
import type { Article } from "../types";

// BUILD-PLAN C6 (feature map #15). The ordering rule is tested against
// fixtures, and the coverage promise ("no week ever shows an empty rail")
// against the real eight guías.

function article(slug: string, range?: [number, number]): Article {
  return {
    slug,
    title: slug,
    excerpt: "x",
    html: "<p>x</p>",
    date: "2026-01-01",
    author: "Mi Bebé",
    ...(range ? { fromWeek: range[0], toWeek: range[1] } : {}),
  };
}

describe("articlesForWeek", () => {
  const bolso = article("bolso", [30, 42]);
  const tramites = article("tramites", [36, 42]);
  const alarma = article("alarma");

  it("puts the most specific guía first", () => {
    // Week 38 matches all three; the six-week range beats the twelve-week one,
    // and the always-relevant one sorts last without being dropped.
    expect(articlesForWeek([bolso, tramites, alarma], 38).map((a) => a.slug)).toEqual([
      "tramites",
      "bolso",
      "alarma",
    ]);
  });

  it("keeps the file's order when two ranges are equally specific", () => {
    // So a content editor changes what leads by moving an entry, not by
    // discovering an invisible rule.
    const a = article("a", [10, 20]);
    const b = article("b", [10, 20]);
    expect(articlesForWeek([a, b], 15).map((x) => x.slug)).toEqual(["a", "b"]);
    expect(articlesForWeek([b, a], 15).map((x) => x.slug)).toEqual(["b", "a"]);
  });

  it("drops a guía whose week has not come yet", () => {
    expect(articlesForWeek([bolso, tramites, alarma], 12).map((a) => a.slug)).toEqual([
      "alarma",
    ]);
  });

  it("respects the limit", () => {
    expect(articlesForWeek([bolso, tramites, alarma], 38, 2)).toHaveLength(2);
  });

  it("returns nothing when there is nothing", () => {
    expect(articlesForWeek([], 20)).toEqual([]);
  });
});

describe("the shipped guías", () => {
  it("never leaves a week with an empty rail", () => {
    // The reason articles with no range stay in the pool: week 17 is named by
    // no guía, and señales de alarma is genuinely worth reading in week 17 —
    // it is simply not *about* week 17.
    for (let week = 1; week <= 42; week += 1) {
      expect(articlesForWeek(ARTICLES, week).length, `semana ${week}`).toBeGreaterThan(0);
    }
  });

  it("surfaces the week-specific ones at the weeks they are for", () => {
    expect(articlesForWeek(ARTICLES, 8).map((a) => a.slug)).toContain(
      "control-prenatal-ips-vs-privado",
    );
    expect(articlesForWeek(ARTICLES, 34).map((a) => a.slug)).toContain(
      "que-llevar-al-sanatorio",
    );
    expect(articlesForWeek(ARTICLES, 38).map((a) => a.slug)).toContain(
      "despues-del-nacimiento-tramites",
    );
    // …and not before: the bolso guía at week 8 is noise.
    expect(articlesForWeek(ARTICLES, 8, 99).map((a) => a.slug)).not.toContain(
      "que-llevar-al-sanatorio",
    );
  });

  it("keeps the always-relevant ones unranged", () => {
    const always = ARTICLES.filter((a) => !isWeekSpecific(a)).map((a) => a.slug);
    expect(always).toContain("senales-de-alarma-embarazo");
  });
});
