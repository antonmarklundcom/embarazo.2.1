import { describe, it, expect } from "vitest";

import { MOODS } from "@/lib/mood";
import { localDay, moodStreak, streakSentence } from "./streak";

// K9-F6. The tests that matter here are the ones about what the app does NOT
// say — a streak feature in a pregnancy app is one bad sentence away from
// being something a woman is relieved to delete.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local noon, `daysAgo` days back — safely inside a calendar day. */
function daysAgo(n: number, now: number): number {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  return date.getTime() - n * MS_PER_DAY;
}

const NOW = new Date(2026, 7, 20, 15, 30).getTime();

describe("localDay", () => {
  it("files a late evening under the day it feels like", () => {
    // 21:00 in Asunción is today. A UTC boundary would file it as tomorrow and
    // break a run the user can see herself keeping.
    const evening = new Date(2026, 7, 20, 21, 0).getTime();
    const morning = new Date(2026, 7, 20, 7, 0).getTime();
    expect(localDay(evening)).toBe(localDay(morning));
    expect(localDay(new Date(2026, 7, 21, 7, 0).getTime())).toBe(
      localDay(morning) + 1,
    );
  });
});

describe("moodStreak", () => {
  it("counts nothing when there is nothing", () => {
    expect(moodStreak([], NOW)).toEqual({ days: 0, loggedToday: false });
  });

  it("counts consecutive days ending today", () => {
    const stamps = [0, 1, 2].map((n) => daysAgo(n, NOW));
    expect(moodStreak(stamps, NOW)).toEqual({ days: 3, loggedToday: true });
  });

  it("keeps a run alive on the day after the last entry", () => {
    // The grace day. A streak that dies at midnight makes the app something
    // you owe — and punishes somebody with morning sickness for sleeping in.
    const stamps = [1, 2, 3].map((n) => daysAgo(n, NOW));
    expect(moodStreak(stamps, NOW)).toEqual({ days: 3, loggedToday: false });
  });

  it("ends a run once a whole day has been missed", () => {
    const stamps = [2, 3, 4].map((n) => daysAgo(n, NOW));
    expect(moodStreak(stamps, NOW)).toEqual({ days: 0, loggedToday: false });
  });

  it("counts several entries in one day as one day", () => {
    const noon = daysAgo(0, NOW);
    const stamps = [noon, noon + 3_600_000, noon - 3_600_000, daysAgo(1, NOW)];
    expect(moodStreak(stamps, NOW).days).toBe(2);
  });

  it("ignores entries from the future rather than trusting them", () => {
    // A device whose clock is wrong should not be congratulated for tomorrow.
    const stamps = [daysAgo(-1, NOW), daysAgo(0, NOW)];
    expect(moodStreak(stamps, NOW)).toEqual({ days: 1, loggedToday: true });
  });

  it("restarts at one after a gap, and says nothing about the gap", () => {
    // A woman too sick to open the app for a week gets a counter that starts
    // again — and a shape with nowhere to put what she lost. There is no
    // `brokenAt`, no `longest`, no `lostDays`, by construction.
    const stamps = [30, 29, 28, 27, 0].map((n) => daysAgo(n, NOW));
    const state = moodStreak(stamps, NOW);
    expect(state).toEqual({ days: 1, loggedToday: true });
    expect(Object.keys(state).sort()).toEqual(["days", "loggedToday"]);
  });

  it("counts a long run across a month boundary", () => {
    const stamps = Array.from({ length: 40 }, (_, n) => daysAgo(n, NOW));
    expect(moodStreak(stamps, NOW).days).toBe(40);
  });
});

describe("streakSentence", () => {
  it("says nothing about a single day", () => {
    // "Día 1 de tu racha" turns one tap into an obligation the app invented
    // for her. A run is worth mentioning once it is a run.
    expect(streakSentence({ days: 0, loggedToday: false })).toBeNull();
    expect(streakSentence({ days: 1, loggedToday: true })).toBeNull();
  });

  it("celebrates from two days on", () => {
    expect(streakSentence({ days: 2, loggedToday: true })).toBe("2 días seguidos. 💛");
  });

  it("counts whole weeks in weeks", () => {
    expect(streakSentence({ days: 7, loggedToday: true })).toBe(
      "Una semana seguida contándonos cómo estás. 💛",
    );
    expect(streakSentence({ days: 21, loggedToday: true })).toBe(
      "3 semanas seguidas contándonos cómo estás. 💛",
    );
    expect(streakSentence({ days: 8, loggedToday: true })).toBe("8 días seguidos. 💛");
  });

  it("never mentions a missed day, at any length", () => {
    for (let days = 0; days <= 400; days += 1) {
      const sentence = streakSentence({ days, loggedToday: false });
      if (sentence === null) continue;
      expect(sentence).not.toMatch(/perd|romp|fall|volv[eé]|otra vez|de nuevo/i);
    }
  });
});

describe("the mood scale", () => {
  it("offers a face for every mood the journal can store", () => {
    // Four faces for five moods was survivable while a tap only navigated to a
    // labelled screen. It stops being survivable the moment a tap is an answer.
    expect(MOODS.map((m) => m.key)).toEqual([
      "muy_bien",
      "bien",
      "regular",
      "mal",
      "muy_mal",
    ]);
    expect(new Set(MOODS.map((m) => m.mouth)).size).toBe(MOODS.length);
  });
});
