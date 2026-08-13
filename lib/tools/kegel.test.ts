import { describe, expect, it } from "vitest";

import {
  KEGEL_LEVELS,
  formatDuration,
  kegelSessionSeconds,
  kegelStepAt,
} from "./kegel";

// BUILD-PLAN D2. `kegelStepAt` is a pure function of elapsed time precisely so
// that a locked screen cannot desynchronise the session — these tests are what
// make that claim true rather than aspirational.

const level = KEGEL_LEVELS[0]!; // 3 s hold, 5 s rest, 10 reps.

describe("kegelStepAt", () => {
  it("starts holding", () => {
    expect(kegelStepAt(level, 0)).toEqual({ phase: "hold", repetition: 1, remaining: 3 });
  });

  it("counts down inside a phase", () => {
    expect(kegelStepAt(level, 2).remaining).toBe(1);
  });

  it("switches to rest exactly when the hold ends", () => {
    expect(kegelStepAt(level, 3).phase).toBe("rest");
    expect(kegelStepAt(level, 3).remaining).toBe(5);
  });

  it("moves to the next repetition after the rest", () => {
    expect(kegelStepAt(level, 8)).toEqual({ phase: "hold", repetition: 2, remaining: 3 });
  });

  it("lands on the right repetition after a long gap", () => {
    // The property that matters: a phone that slept for a minute resumes where
    // the clock says, not where a chain of timers stopped.
    expect(kegelStepAt(level, 60)).toEqual({
      phase: "rest",
      repetition: 8,
      remaining: 4,
    });
  });

  it("finishes after the last repetition and stays finished", () => {
    const total = kegelSessionSeconds(level);
    expect(kegelStepAt(level, total).phase).toBe("done");
    expect(kegelStepAt(level, total + 500).phase).toBe("done");
  });
});

describe("the levels themselves", () => {
  it("never rests less than it holds", () => {
    // Resting for less time than the contraction is how a pelvic-floor session
    // becomes fatigue training, which is the opposite of the point.
    for (const option of KEGEL_LEVELS) {
      expect(option.restSeconds, option.id).toBeGreaterThanOrEqual(option.holdSeconds);
    }
  });

  it("stays short enough that somebody finishes it", () => {
    for (const option of KEGEL_LEVELS) {
      expect(kegelSessionSeconds(option), option.id).toBeLessThanOrEqual(240);
    }
  });

  it("gets harder in one direction only", () => {
    for (let i = 1; i < KEGEL_LEVELS.length; i += 1) {
      expect(KEGEL_LEVELS[i]!.holdSeconds).toBeGreaterThan(
        KEGEL_LEVELS[i - 1]!.holdSeconds,
      );
    }
  });
});

describe("formatDuration", () => {
  it("reads the way somebody says it", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(120)).toBe("2 min");
    expect(formatDuration(150)).toBe("2 min 30 s");
  });
});
