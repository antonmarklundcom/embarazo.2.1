// BUILD-PLAN D2 — Kegel exercises (feature map #21), pure half.
//
// The program is data, not a hard-coded timer loop, so the levels can be
// adjusted by the medical reviewer without touching the screen that runs them.
//
// Why this is a tool and not an article: pelvic-floor work is the cheapest
// thing there is to do about incontinence during pregnancy and after birth, and
// everyone already knows it helps. What nobody has is something that counts for
// them while they do it.

export interface KegelLevel {
  id: "suave" | "media" | "firme";
  label: string;
  /** Seconds holding the contraction. */
  holdSeconds: number;
  /** Seconds resting between contractions — never shorter than the hold. */
  restSeconds: number;
  repetitions: number;
  description: string;
}

export const KEGEL_LEVELS: KegelLevel[] = [
  {
    id: "suave",
    label: "Suave",
    holdSeconds: 3,
    restSeconds: 5,
    repetitions: 10,
    description: "Para empezar. Contracciones cortas y descanso largo.",
  },
  {
    id: "media",
    label: "Media",
    holdSeconds: 5,
    restSeconds: 5,
    repetitions: 12,
    description: "Cuando las de 3 segundos ya te salen sin esfuerzo.",
  },
  {
    id: "firme",
    label: "Firme",
    holdSeconds: 8,
    restSeconds: 8,
    repetitions: 12,
    description: "Sostener más tiempo, no apretar más fuerte.",
  },
];

export type KegelPhase = "hold" | "rest" | "done";

export interface KegelStep {
  phase: KegelPhase;
  /** 1-based; equal to `repetitions` on the last hold. */
  repetition: number;
  /** Seconds left in this phase. */
  remaining: number;
}

/**
 * Where the session is `elapsed` seconds in.
 *
 * A pure function of elapsed time rather than a chain of `setTimeout`s: a phone
 * that locks the screen mid-session throttles every timer, and a user who
 * unlocks it should see where she actually is, not where the timers stopped.
 */
export function kegelStepAt(level: KegelLevel, elapsedSeconds: number): KegelStep {
  const cycle = level.holdSeconds + level.restSeconds;
  const total = cycle * level.repetitions;
  if (elapsedSeconds >= total) {
    return { phase: "done", repetition: level.repetitions, remaining: 0 };
  }

  const intoCycle = elapsedSeconds % cycle;
  const repetition = Math.floor(elapsedSeconds / cycle) + 1;

  if (intoCycle < level.holdSeconds) {
    return {
      phase: "hold",
      repetition,
      remaining: level.holdSeconds - intoCycle,
    };
  }
  return { phase: "rest", repetition, remaining: cycle - intoCycle };
}

/** Total session length, for "esto te lleva 2 minutos". */
export function kegelSessionSeconds(level: KegelLevel): number {
  return (level.holdSeconds + level.restSeconds) * level.repetitions;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}
