"use client";

import { db, notDeleted } from "@/lib/db";
import { refreshWeeklyTips } from "@/lib/push/client";
import { isValidBirthDate, localDay } from "./age";

// Growth plan item 9 ("Ya nació") — the only writers of `Pregnancy.birthDate`.
// Both touch the one live pregnancy row and nothing else: the pregnancy's own
// dates, diary, photos and tools stay exactly as they were.

async function livePregnancy() {
  return notDeleted(await db().pregnancy.toArray())[0];
}

/** Record (or correct) the birth date. Returns false if the date is out of range. */
export async function recordBirth(birthDate: number, now: number = Date.now()): Promise<boolean> {
  const pregnancy = await livePregnancy();
  if (!pregnancy?.id || !isValidBirthDate(birthDate, pregnancy.lmpDate, now)) return false;
  await db().pregnancy.update(pregnancy.id, {
    birthDate: localDay(birthDate),
    // A correction keeps the original tap's clock: the undo window is about
    // the first "Sí", not the last edit.
    birthRecordedAt: pregnancy.birthRecordedAt ?? now,
  });
  // G3: the queued "semana nueva" pokes become baby-age ones right away.
  // Fire and forget: without push, or offline, it does nothing.
  void refreshWeeklyTips();
  return true;
}

/** "Deshacer": back to the pregnancy, as if the card had never been tapped. */
export async function clearBirth(): Promise<void> {
  const pregnancy = await livePregnancy();
  if (!pregnancy?.id) return;
  await db().pregnancy.update(pregnancy.id, { birthDate: undefined, birthRecordedAt: undefined });
  void refreshWeeklyTips();
}
