"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import {
  getCurrentWeek,
  getTrimester,
  getDaysRemaining,
  getCompletedGestation,
  type CompletedGestation,
} from "./pregnancy";
import type { Trimester } from "./types";
import type { AppMode, UserRole } from "./db";
import {
  DEFAULT_PREGNANCY_SETTINGS,
  DEFAULT_WEEK_DISPLAY,
  type DueDateMethod,
  type WeekDisplay,
} from "./dueDate";

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

  // --- B1/B2/B3 ---
  /** Who is using the app. Defaults to "mama" for profiles created before B1. */
  role: UserRole;
  /** Baby nickname, when the user gave one. Threaded through copy. */
  babyName?: string;
  /** How the user entered the date, so Ajustes can reopen the same form. */
  dueDateMethod?: DueDateMethod;
  /** Gestation length in days. Defaults to 280. */
  gestationDays: number;
  /** "24+3" (default) or "25". */
  weekDisplay: WeekDisplay;
  plannedDeliveryDate?: number;
}

/**
 * What to call the baby in copy. Falls back to "tu bebé" so every caller can
 * interpolate unconditionally — the whole point of B2 is that no screen needs
 * to branch on whether a nickname exists.
 */
export function babyLabel(name: string | undefined): string {
  return name?.trim() || "tu bebé";
}

/**
 * Live-reads the on-device profile + pregnancy and derives week/trimester.
 * Returns loading=true until the first IndexedDB read resolves.
 */
export function useProfile(): ProfileState {
  const data = useLiveQuery(async () => {
    const profile = await db().profile.toArray();
    const pregnancy = await db().pregnancy.toArray();
    const babies = await db().babies.orderBy("order").toArray();
    return {
      profile: profile[0] ?? null,
      pregnancy: pregnancy[0] ?? null,
      baby: babies[0] ?? null,
    };
  }, []);

  const defaults = {
    role: "mama" as UserRole,
    gestationDays: DEFAULT_PREGNANCY_SETTINGS.gestationDays,
    weekDisplay: DEFAULT_WEEK_DISPLAY,
  };

  if (data === undefined) {
    return {
      loading: true,
      hasProfile: false,
      mode: "embarazada",
      hasPregnancy: false,
      ...defaults,
    };
  }

  const { profile, pregnancy, baby } = data;
  if (!profile) {
    return {
      loading: false,
      hasProfile: false,
      mode: "embarazada",
      hasPregnancy: false,
      ...defaults,
    };
  }

  const mode: AppMode = profile.mode ?? "embarazada";
  const base = {
    loading: false,
    hasProfile: true,
    mode,
    department: profile.department,
    city: profile.city,
    nextAppointment: profile.nextAppointment,
    // Missing role means a profile created before B1 — treat as the mother,
    // which is who every existing user is.
    role: profile.role ?? defaults.role,
    babyName: baby?.nickname,
  };

  // "Planeando" users (and any profile without a pregnancy record yet) have no
  // gestational week. Mode switching never deletes the pregnancy row, so a
  // returning user keeps her data.
  if (!pregnancy) {
    return {
      ...base,
      hasPregnancy: false,
      gestationDays: defaults.gestationDays,
      weekDisplay: defaults.weekDisplay,
    };
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
    dueDateMethod: pregnancy.dueDateMethod,
    gestationDays: pregnancy.gestationDays ?? defaults.gestationDays,
    weekDisplay: pregnancy.weekDisplay ?? defaults.weekDisplay,
    plannedDeliveryDate: pregnancy.plannedDeliveryDate,
  };
}
