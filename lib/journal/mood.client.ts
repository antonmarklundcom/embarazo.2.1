"use client";

import { db, notDeleted, type Mood } from "@/lib/db";

import { localDay } from "./streak";

// K9-F6 — "first make the home mood check-in actually record the mood on tap
// (today it only navigates), then build the streak on it."
//
// The recording is an **upsert on today's entry**, and that is the whole
// design decision. A tap that always appended would turn a woman who taps
// "bien", changes her mind and taps "regular" into two contradictory rows in
// her own journal — and then into two days of nothing, because the streak
// counts days rather than taps. The journal is something she reads back; it
// should say what she meant, not what she pressed.
//
// It also deliberately writes onto an entry that already has symptoms or a
// note on it, rather than beside it. If she logged headaches this morning on
// /herramientas/sintomas and taps a face on the home screen tonight, she has
// told us how *this day* went — she has not started a second day.

export interface MoodWriteResult {
  ok: boolean;
  /** True when this replaced a mood she had already recorded today. */
  replaced: boolean;
}

/**
 * Record today's mood.
 *
 * Swallows storage errors and reports them as `ok: false`: the home screen
 * shows a quiet message and stays usable, exactly as onboarding's draft does.
 * A check-in is not worth a crash.
 */
export async function recordMoodToday(
  mood: Mood,
  week: number,
  now: number = Date.now(),
): Promise<MoodWriteResult> {
  try {
    const today = localDay(now);
    const rows = notDeleted(await db().journalEntries.toArray());
    const existing = rows.find((row) => localDay(row.createdAt) === today);

    if (existing?.id) {
      const replaced = existing.mood !== undefined;
      await db().journalEntries.update(existing.id, { mood });
      return { ok: true, replaced };
    }

    await db().journalEntries.add({
      week,
      mood,
      symptoms: [],
      // Never encrypted, because there is nothing to encrypt: an entry created
      // from a face tap carries no note, so it can never need the PIN — which
      // is what lets the home screen record without ever prompting for one.
      note: "",
      createdAt: now,
    });
    return { ok: true, replaced: false };
  } catch {
    return { ok: false, replaced: false };
  }
}
