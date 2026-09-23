import { describe, expect, it } from "vitest";

import {
  KICK_GOAL,
  KICK_WINDOW_MS,
  KICKS_NUDGE_HINT,
  KICKS_WINDOW_ALERT,
  kickBaseline,
  kickNudge,
  kickWindowMissed,
  type KickSessionSample,
} from "./kicks";

// BUILD-PLAN D7. The nudge only ever compares a woman against her own recent
// history — these tests are what makes "no baseline, no opinion" true.

const NOW = Date.parse("2026-09-06T09:00:00Z");
const HOUR = 60 * 60 * 1000;

interface CompletedSession {
  startedAt: number;
  count: number;
  completedAt: number;
}

/** A completed session of `count` kicks over `minutes`, `hoursAgo` before now. */
function session(count: number, minutes: number, hoursAgo: number): CompletedSession {
  const startedAt = NOW - hoursAgo * HOUR;
  return { startedAt, completedAt: startedAt + minutes * 60000, count };
}

describe("kickBaseline", () => {
  it("is null with fewer than 3 completed sessions", () => {
    const sessions = [session(10, 20, 1), session(10, 20, 2)];
    expect(kickBaseline(sessions)).toBeNull();
  });

  it("ignores sessions that never completed", () => {
    const sessions: KickSessionSample[] = [
      session(10, 20, 1),
      session(10, 20, 2),
      { startedAt: NOW - 3 * HOUR, count: 4 }, // still running, or abandoned
    ];
    expect(kickBaseline(sessions)).toBeNull();
  });

  it("is the median rate over the last 7 completed sessions", () => {
    // 10 kicks in 20 min = 5 kicks / 10 min, for every session.
    const sessions = Array.from({ length: 5 }, (_, i) => session(10, 20, i + 1));
    expect(kickBaseline(sessions)).toBe(5);
  });

  it("takes only the most recent 7 when more exist", () => {
    const recent = Array.from({ length: 7 }, (_, i) => session(10, 20, i + 1)); // rate 5
    const stale = [session(10, 100, 200), session(10, 100, 201)]; // rate 1, far older
    expect(kickBaseline([...stale, ...recent])).toBe(5);
  });

  it("handles a session of 0 kicks without dividing badly", () => {
    const sessions = [session(0, 20, 1), session(0, 20, 2), session(0, 20, 3)];
    expect(kickBaseline(sessions)).toBe(0);
  });
});

describe("kickNudge", () => {
  it("says nothing with no baseline", () => {
    expect(kickNudge(session(10, 20, 0), null)).toBeNull();
  });

  it("nudges when today is under half the baseline", () => {
    const today = session(2, 20, 0); // 1 kick / 10 min
    expect(kickNudge(today, 5)).toEqual({ nudge: true });
  });

  it("says nothing when today matches or beats the baseline", () => {
    const today = session(10, 20, 0); // 5 kicks / 10 min
    expect(kickNudge(today, 5)).toBeNull();
  });

  it("says nothing right at the 50% line", () => {
    const today = session(5, 20, 0); // 2.5 kicks / 10 min = exactly half of 5
    expect(kickNudge(today, 5)).toBeNull();
  });

  it("never nudges off a zero baseline", () => {
    const today = session(0, 20, 0);
    expect(kickNudge(today, 0)).toBeNull();
  });
});

describe("kickWindowMissed", () => {
  it("is false inside the 2-hour window, whatever the count", () => {
    expect(kickWindowMissed(0, KICK_WINDOW_MS)).toBe(false);
    expect(kickWindowMissed(3, 30 * 60 * 1000)).toBe(false);
  });

  it("is true past 2 hours with fewer than the goal", () => {
    expect(kickWindowMissed(KICK_GOAL - 1, KICK_WINDOW_MS + 1)).toBe(true);
    expect(kickWindowMissed(0, 3 * HOUR)).toBe(true);
  });

  it("is false past 2 hours once the goal was reached", () => {
    expect(kickWindowMissed(KICK_GOAL, 3 * HOUR)).toBe(false);
  });
});

describe("kick copy", () => {
  it("never shows a route path as text — the screen renders the link", () => {
    for (const text of [KICKS_NUDGE_HINT, KICKS_WINDOW_ALERT]) {
      expect(text.es).not.toContain("/emergencia");
      expect(text.gn).not.toContain("/emergencia");
    }
  });
});
