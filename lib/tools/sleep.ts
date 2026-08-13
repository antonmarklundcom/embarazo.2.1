// BUILD-PLAN D2 — sleep log (feature map #21), pure half.
//
// Deliberately not a sleep *tracker*: no microphone, no accelerometer, no
// "sleep score". A pregnant woman knows how badly she slept. What she does not
// have is the seven-night picture to show at her next control, which is where
// "no duermo" turns into a conversation about acidez, calambres or ansiedad.

export interface SleepNight {
  date: number;
  minutes: number;
  quality: number;
  reasons?: string[];
}

/** What kept you awake. A fixed list: free text here would be a diary. */
export const SLEEP_REASONS = [
  "Ganas de hacer pis",
  "Acidez",
  "Calambres",
  "Calor",
  "El bebé se movía",
  "Ansiedad o pensamientos",
  "Dolor de espalda",
] as const;

export const MIN_QUALITY = 1;
export const MAX_QUALITY = 5;

export const QUALITY_LABELS: Record<number, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Más o menos",
  4: "Bien",
  5: "Muy bien",
};

/** "7 h 30 min", the way somebody says it out loud. */
export function formatSleep(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export interface SleepSummary {
  nights: number;
  averageMinutes: number;
  averageQuality: number;
  /** The reason that came up most often, when any did. */
  topReason: string | null;
}

/**
 * The seven-night picture.
 *
 * Averages over the nights that exist rather than treating a missing night as
 * zero: a woman who logged four nights slept the other three, she just did not
 * open the app, and counting those as "0 h" would produce a number worth
 * worrying about for no reason.
 */
export function summarise(nights: readonly SleepNight[]): SleepSummary {
  if (nights.length === 0) {
    return { nights: 0, averageMinutes: 0, averageQuality: 0, topReason: null };
  }

  const counts = new Map<string, number>();
  for (const night of nights) {
    for (const reason of night.reasons ?? []) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  let topReason: string | null = null;
  let topCount = 0;
  for (const [reason, count] of counts) {
    if (count > topCount) {
      topReason = reason;
      topCount = count;
    }
  }

  const totalMinutes = nights.reduce((sum, night) => sum + night.minutes, 0);
  const totalQuality = nights.reduce((sum, night) => sum + night.quality, 0);

  return {
    nights: nights.length,
    averageMinutes: Math.round(totalMinutes / nights.length),
    averageQuality: Math.round((totalQuality / nights.length) * 10) / 10,
    topReason,
  };
}

/** Midnight of the day `date` falls in, so one night is one row. */
export function nightKey(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
