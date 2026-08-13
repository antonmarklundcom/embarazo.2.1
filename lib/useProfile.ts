"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, notDeleted } from "./db";
import {
  getCurrentWeek,
  getTrimester,
  getDaysRemaining,
  getCompletedGestation,
  GESTATION_DAYS,
  type CompletedGestation,
} from "./pregnancy";
import type { Trimester } from "./types";
import type { AppMode, BabyIdentity, Pregnancy, Role } from "./db";

export interface ProfileState {
  loading: boolean;
  hasProfile: boolean;
  /** "embarazada" (default) or "planeando" — see build spec §3. */
  mode: AppMode;
  /** Relationship role (B1). Defaults to "mama" — see lib/roleCopy.ts. */
  role: Role;
  hasPregnancy: boolean;
  /** Baby identity/twins (B2). Empty array when no nickname has been set. */
  babies: BabyIdentity[];
  department?: string;
  city?: string;
  nextAppointment?: number;
  /** C8: the sanatorio number the user saved on /emergencia, if any. */
  sanatorioPhone?: string;
  lmpDate?: number;
  dueDate?: number;
  week?: number;
  trimester?: Trimester;
  daysRemaining?: number;
  /** Medical completed-weeks gestation (carné convention, build spec §1). */
  completed?: CompletedGestation;
  /** B3: which method produced the stored LMP. Defaults to "lmp". */
  method?: NonNullable<Pregnancy["method"]>;
  /** B3: adjustable pregnancy length in days. Defaults to GESTATION_DAYS (280). */
  gestationDays?: number;
  /** B3: planned delivery date, separate from the estimated due date. */
  plannedDeliveryDate?: number;
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
    return {
      loading: true,
      hasProfile: false,
      mode: "embarazada",
      babies: [],
      role: "mama",
      hasPregnancy: false,
    };
  }

  const { profile, pregnancy } = data;
  if (!profile) {
    return {
      loading: false,
      hasProfile: false,
      mode: "embarazada",
      babies: [],
      role: "mama",
      hasPregnancy: false,
    };
  }

  const mode: AppMode = profile.mode ?? "embarazada";
  const role: Role = profile.role ?? "mama";
  const base = {
    loading: false,
    hasProfile: true,
    mode,
    babies: profile.babies ?? [],
    role,
    department: profile.department,
    city: profile.city,
    nextAppointment: profile.nextAppointment,
    sanatorioPhone: profile.sanatorioPhone,
  };

  // "Planeando" users (and any profile without a pregnancy record yet) have no
  // gestational week. Mode switching never deletes the pregnancy row, so a
  // returning user keeps her data.
  if (!pregnancy) {
    return { ...base, hasPregnancy: false };
  }

  const week = getCurrentWeek(pregnancy.lmpDate);
  const gestationDays = pregnancy.gestationDays ?? GESTATION_DAYS;
  return {
    ...base,
    hasPregnancy: true,
    lmpDate: pregnancy.lmpDate,
    dueDate: pregnancy.dueDate,
    week,
    trimester: getTrimester(week),
    daysRemaining: getDaysRemaining(pregnancy.lmpDate, Date.now(), gestationDays),
    completed: getCompletedGestation(pregnancy.lmpDate),
    method: pregnancy.method ?? "lmp",
    gestationDays,
    plannedDeliveryDate: pregnancy.plannedDeliveryDate,
  };
}
