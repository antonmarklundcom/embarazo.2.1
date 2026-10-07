import { describe, expect, it } from "vitest";

import { WEEKS } from "@/lib/weeks";
import weeklyLines from "@/lib/seed/weeklyLines.json";
import obstetraNotes from "@/lib/seed/obstetraNotes.json";
import articles from "@/lib/seed/articles.json";

// F05 (2026-10 review) — two kinds of clinical sentence the app must not say.
//
// 1. Term, counted from the display week. The big number is the week in
//    progress (`floor(days / 7) + 1`), one ahead of the carné's completed
//    weeks. Week 37 of the app is 36+0…36+6 — still preterm — so "a término
//    temprano" there, "término completo" at 39 or "llegó tu fecha" at 40 was a
//    week early, in the same direction as a missed preterm alarm.
// 2. Waiting out fewer movements. "Recostate, tomá algo y contá" before
//    calling is the advice the site, the kicks tool and NHS guidance all
//    reject: fewer movements than usual is a reason to call now.
//
// The wording adopted is the site's (content/semanas.php), pending clinician
// sign-off for both repos.

const lineOf = (week: number) => weeklyLines.find((l) => l.week === week)?.line ?? "";
const weekOf = (week: number) => WEEKS.find((w) => w.week === week)!;
// The obstetra notes are keyed by the same display week (ObstetraCard gets the
// home screen's week). Gated drafts, but F22 means approving one publishes it,
// so the same rule has to hold before any reviewer reads them.
const noteOf = (week: number) => obstetraNotes.find((n) => n.week === week)?.note ?? "";

describe("term is counted in completed weeks", () => {
  it("does not call display week 34 nearly ready", () => {
    expect(weekOf(34).milestone).toMatch(/prematur/);
    expect(lineOf(34)).toMatch(/prematur/);
  });

  it("does not start early term at display week 37, nor full term at 39", () => {
    for (const text of [weekOf(37).milestone, lineOf(37), noteOf(37)]) {
      expect(text).not.toMatch(/se considera a término/i);
      expect(text).not.toMatch(/^a término temprano/i);
      expect(text).toMatch(/37 semanas completas/);
    }
    for (const text of [weekOf(39).milestone, lineOf(39), noteOf(39)]) {
      expect(text).not.toMatch(/^(bebé )?a término completo/i);
      expect(text).toMatch(/se acerca/i);
    }
  });

  it("does not say the due date has arrived during display week 40", () => {
    expect(weekOf(40).milestone).not.toMatch(/llegó tu fecha/i);
    expect(lineOf(40)).not.toMatch(/llegó tu fecha/i);
  });
});

describe("fewer movements means calling, not waiting", () => {
  const WAIT_IT_OUT = /recost\w* de costado|tom[aá] algo (fresco|fr[ií]o)/i;

  it("is never told to lie down and count first", () => {
    const texts = [
      ...WEEKS.flatMap((w) => [w.milestone, w.tip]),
      ...weeklyLines.map((l) => l.line),
      ...obstetraNotes.map((n) => n.note),
      ...(articles as { html?: string }[]).map((a) => a.html ?? ""),
    ];
    expect(texts.filter((text) => WAIT_IT_OUT.test(text))).toEqual([]);
  });
});
