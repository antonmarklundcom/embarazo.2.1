"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, notDeleted } from "./db";
import {
  getCurrentWeek,
  getTrimester,
  getDaysRemaining,
  getCompletedGestation,
  type CompletedGestation,
} from "./pregnancy";
import type { Trimester } from "./types";
import type { AppMode } from "./db";

export interface ProfileState {
  loading: boolean;
  hasProfile: boolean;
  /** "embarazada" (default) or "planeando" — see build spec §3. */
  mode: AppMode;
  hasPregnancy: boolean;
  department?: string;
  city?: string;
  nextAppointment?: number;
  lmpDate?: number;
  dueDate?: number;
  week?: number;
  trimester?: Trimester;
  daysRemaining?: number;
  /** Medical completed-weeks gestation (carné convention, build spec §1). */
  completed?: CompletedGestation;
}

/**
 * Live-reads the on-device profile + pregnancy and derives week/trimester.
 * Returns loading=true until the first IndexedDB read resolves.
 */
export function useProfile(): ProfileState {
  const data = useLiveQuery(async () => {
    const profile = notDeleted(await db().profile.toArray());
    const pregnancy = notDeleted(await db().pregnancy.toArray());
    return {
      profile: profile[0] ?? null,
      pregnancy: pregnancy[0] ?? null,
    };
  }, []);

  if (data === undefined) {
    return { loading: true, hasProfile: false, mode: "embarazada", hasPregnancy: false };
  }

  const { profile, pregnancy } = data;
  if (!profile) {
    return { loading: false, hasProfile: false, mode: "embarazada", hasPregnancy: false };
  }

  const mode: AppMode = profile.mode ?? "embarazada";
  const base = {
    loading: false,
    hasProfile: true,
    mode,
    department: profile.department,
    city: profile.city,
    nextAppointment: profile.nextAppointment,
  };

  // "Planeando" users (and any profile without a pregnancy record yet) have no
  // gestational week. Mode switching never deletes the pregnancy row, so a
  // returning user keeps her data.
  if (!pregnancy) {
    return { ...base, hasPregnancy: false };
  }

  const week = getCurrentWeek(pregnancy.lmpDate);
  return {
    ...base,
    hasPregnancy: true,
    lmpDate: pregnancy.lmpDate,
    dueDate: pregnancy.dueDate,
    week,
    trimester: getTrimester(week),
    daysRemaining: getDaysRemaining(pregnancy.lmpDate),
    completed: getCompletedGestation(pregnancy.lmpDate),
  };
}
