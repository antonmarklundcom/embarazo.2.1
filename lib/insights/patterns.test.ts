import { describe, expect, it } from "vitest";

import { NEVER_ANALYSED, SYMPTOMS } from "@/lib/symptoms";
import {
  MIN_DIFFERENCE,
  MIN_GROUP_DAYS,
  MIN_LOGGED_DAYS,
  MIN_OCCURRENCES,
  WINDOW_DAYS,
  dayKey,
  findInsights,
  type JournalDay,
  type SleepNight,
} from "./patterns";

// BUILD-PLAN K9 / F3. The interesting assertions here are the ones about what
// this does NOT say: a pregnancy app that manufactures a pattern out of four
// entries is teaching somebody to believe things that are not there, about her
// own body, during a pregnancy.

const NOW = new Date(2026, 7, 30, 12, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

/** `daysAgo` days before NOW, at 10:00 local. */
function day(daysAgo: number, hour = 10): number {
  const date = new Date(NOW);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function entries(
  spec: { daysAgo: number; symptoms?: string[]; mood?: string }[],
): JournalDay[] {
  return spec.map((s) => ({
    createdAt: day(s.daysAgo),
    symptoms: s.symptoms ?? [],
    mood: s.mood,
  }));
}

/** 14 quiet days, so the sample-size floor is never what a test is measuring. */
function quietDays(count = 14): JournalDay[] {
  return entries(
    Array.from({ length: count }, (_, i) => ({ daysAgo: i, symptoms: [] })),
  );
}

describe("silence is the default", () => {
  it("says nothing with no data at all", () => {
    expect(findInsights([], [], NOW)).toEqual([]);
  });

  it("says nothing below the logged-days floor, however strong the signal", () => {
    // Nine days, every single one with the symptom and a bad night. A weaker
    // rule would call this the strongest pattern it had ever seen.
    const days = Array.from({ length: MIN_LOGGED_DAYS - 1 }, (_, i) => ({
      daysAgo: i,
      symptoms: ["Náuseas"],
    }));
    const nights: SleepNight[] = days.map((d) => ({
      date: day(d.daysAgo),
      quality: 1,
    }));
    expect(findInsights(entries(days), nights, NOW)).toEqual([]);
  });

  it("says nothing when a symptom appears fewer than the minimum times", () => {
    const days = [
      ...quietDays(14),
      ...entries([{ daysAgo: 0, symptoms: ["Acidez"] }]),
    ];
    const nights: SleepNight[] = [{ date: day(0), quality: 1 }];
    expect(findInsights(days, nights, NOW)).toEqual([]);
  });

  it("says nothing when the two groups are too small to compare", () => {
    // Plenty of days, plenty of the symptom, but only two bad nights.
    const days = entries(
      Array.from({ length: 14 }, (_, i) => ({
        daysAgo: i,
        symptoms: i < 6 ? ["Acidez"] : [],
      })),
    );
    const nights: SleepNight[] = [
      { date: day(0), quality: 1 },
      { date: day(1), quality: 1 },
    ];
    expect(MIN_GROUP_DAYS).toBeGreaterThan(2);
    // No sleep comparison. The "you logged this a lot" observation is still
    // true and still offered — suppressing a correlation is not the same as
    // pretending she logged nothing.
    expect(
      findInsights(days, nights, NOW).filter((i) => i.templateId === "sleep"),
    ).toEqual([]);
  });

  it("says nothing when the difference is not obvious", () => {
    // The symptom on 5 of 7 bad nights and 4 of 7 good ones: a real-looking
    // number, and nothing anybody should act on.
    const days = entries([
      ...[0, 1, 2, 3, 4].map((i) => ({ daysAgo: i, symptoms: ["Acidez"] })),
      ...[5, 6].map((i) => ({ daysAgo: i, symptoms: [] })),
      ...[7, 8, 9, 10].map((i) => ({ daysAgo: i, symptoms: ["Acidez"] })),
      ...[11, 12, 13].map((i) => ({ daysAgo: i, symptoms: [] })),
    ]);
    const nights: SleepNight[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      date: day(i),
      quality: 1,
    }));

    const found = findInsights(days, nights, NOW).filter(
      (i) => i.templateId === "sleep",
    );
    expect(found).toEqual([]);
    expect(MIN_DIFFERENCE).toBeGreaterThanOrEqual(0.3);
  });
});

describe("a finding, when there really is one", () => {
  const days = entries([
    // Seven bad nights: the symptom on six of them.
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ daysAgo: i, symptoms: ["Náuseas"] })),
    { daysAgo: 6, symptoms: [] },
    // Seven good nights: the symptom on one.
    { daysAgo: 7, symptoms: ["Náuseas"] },
    ...[8, 9, 10, 11, 12, 13].map((i) => ({ daysAgo: i, symptoms: [] })),
  ]);
  const nights: SleepNight[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    date: day(i),
    quality: 1,
  }));

  it("reports the counts, not a conclusion", () => {
    const [insight] = findInsights(days, nights, NOW);
    expect(insight).toMatchObject({
      templateId: "sleep",
      symptom: "Náuseas",
      withCount: 6,
      withDays: 7,
      withoutCount: 1,
      withoutDays: 7,
    });
    // The output is numbers. There is no sentence anywhere in this module.
    expect(JSON.stringify(insight)).not.toMatch(/dorm|caus|porque/i);
  });

  it("is deterministic — same input, same order, always", () => {
    const once = findInsights(days, nights, NOW);
    const twice = findInsights([...days].reverse(), nights, NOW);
    expect(twice).toEqual(once);
  });

  it("counts a day once however many times she checked in", () => {
    // Three entries on one bad day must not outweigh a week of quiet ones.
    const noisy = [
      ...days,
      ...entries([
        { daysAgo: 0, symptoms: ["Náuseas"] },
        { daysAgo: 0, symptoms: ["Náuseas"] },
      ]),
    ];
    expect(findInsights(noisy, nights, NOW)).toEqual(
      findInsights(days, nights, NOW),
    );
  });
});

describe("mood findings", () => {
  it("compares low-mood days against days she rated, not against silence", () => {
    // Days with no mood at all are in neither group: "she did not say" is not
    // "she felt fine".
    const days = entries([
      ...[0, 1, 2, 3, 4].map((i) => ({
        daysAgo: i,
        mood: "mal",
        symptoms: ["Dolor de espalda"],
      })),
      { daysAgo: 5, mood: "mal", symptoms: [] },
      ...[6, 7, 8, 9, 10].map((i) => ({ daysAgo: i, mood: "bien", symptoms: [] })),
      // Un-rated days, with the symptom, which must not count as "good mood".
      ...[11, 12, 13].map((i) => ({ daysAgo: i, symptoms: ["Dolor de espalda"] })),
    ]);

    const [insight] = findInsights(days, [], NOW);
    expect(insight).toMatchObject({
      templateId: "mood",
      symptom: "Dolor de espalda",
      withDays: 6,
      withoutDays: 5,
      withoutCount: 0,
    });
  });

  it("takes the worst mood of a day, not the last one entered", () => {
    const days = entries([
      ...[0, 1, 2, 3].map((i) => ({
        daysAgo: i,
        mood: "muy_mal",
        symptoms: ["Acidez"],
      })),
      // Same day: felt terrible in the morning, fine at night. The day counts
      // as a bad one.
      { daysAgo: 4, mood: "muy_mal", symptoms: ["Acidez"] },
      { daysAgo: 4, mood: "bien", symptoms: [] },
      ...[5, 6, 7, 8, 9].map((i) => ({ daysAgo: i, mood: "bien", symptoms: [] })),
    ]);

    const [insight] = findInsights(days, [], NOW);
    expect(insight?.withDays).toBe(5);
    expect(insight?.withCount).toBe(5);
  });
});

describe("what it refuses to analyse", () => {
  function overwhelming(symptom: string): JournalDay[] {
    return entries([
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ daysAgo: i, symptoms: [symptom] })),
      ...[6, 7, 8, 9, 10, 11, 12, 13].map((i) => ({ daysAgo: i, symptoms: [] })),
    ]);
  }
  const nights: SleepNight[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    date: day(i),
    quality: 1,
  }));

  it("never writes a line about contracciones", () => {
    // The one entry on the list that can be an alarm sign. A trends card must
    // not join the conversation /emergencia owns.
    expect(NEVER_ANALYSED).toContain("Contracciones");
    expect(findInsights(overwhelming("Contracciones"), nights, NOW)).toEqual([]);
  });

  it("never writes a line about 'Otros'", () => {
    // A bucket, not a symptom — and nonsense that looks like a finding.
    expect(findInsights(overwhelming("Otros"), nights, NOW)).toEqual([]);
  });

  it("ignores a symptom that is not in the app's own vocabulary", () => {
    expect(findInsights(overwhelming("sangrado abundante"), nights, NOW)).toEqual(
      [],
    );
  });

  it("still analyses the ordinary ones", () => {
    for (const symptom of SYMPTOMS.filter((s) => !NEVER_ANALYSED.includes(s))) {
      expect(
        findInsights(overwhelming(symptom), nights, NOW),
        symptom,
      ).not.toEqual([]);
    }
  });
});

describe("the window", () => {
  it("ignores entries older than the window", () => {
    const old = entries(
      Array.from({ length: 20 }, (_, i) => ({
        daysAgo: WINDOW_DAYS + 1 + i,
        symptoms: ["Náuseas"],
      })),
    );
    expect(findInsights(old, [], NOW)).toEqual([]);
  });

  it("ignores an entry dated in the future", () => {
    const days = [
      ...quietDays(14),
      ...entries([{ daysAgo: -3, symptoms: ["Náuseas"] }]),
    ];
    expect(findInsights(days, [], NOW)).toEqual([]);
  });
});

describe("the fallback observation", () => {
  it("names the most-logged symptom when nothing correlates", () => {
    const days = entries(
      Array.from({ length: 14 }, (_, i) => ({
        daysAgo: i,
        symptoms: i % 2 === 0 ? ["Cansancio"] : [],
      })),
    );
    const [insight] = findInsights(days, [], NOW);
    expect(insight).toMatchObject({
      templateId: "frequent",
      symptom: "Cansancio",
      withCount: 7,
      withDays: 14,
    });
  });

  it("stays quiet when nothing is dominant enough to be worth saying", () => {
    const days = entries(
      Array.from({ length: 14 }, (_, i) => ({
        daysAgo: i,
        symptoms: i < 3 ? ["Antojos"] : [],
      })),
    );
    expect(findInsights(days, [], NOW)).toEqual([]);
    expect(MIN_OCCURRENCES).toBeGreaterThanOrEqual(3);
  });
});

describe("dayKey", () => {
  it("buckets by LOCAL day, so a late-night entry stays on its own date", () => {
    const late = new Date(2026, 7, 21, 23, 30).getTime();
    const early = new Date(2026, 7, 21, 0, 30).getTime();
    expect(dayKey(late)).toBe(dayKey(early));
    expect(dayKey(late + DAY)).not.toBe(dayKey(late));
  });
});
