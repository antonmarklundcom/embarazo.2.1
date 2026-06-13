"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { getCurrentWeek, getTrimester, getDaysRemaining } from "./pregnancy";
import type { Trimester } from "./types";

export interface ProfileState {
  loading: boolean;
  hasProfile: boolean;
  department?: string;
  city?: string;
  nextAppointment?: number;
  lmpDate?: number;
  dueDate?: number;
  week?: number;
  trimester?: Trimester;
  daysRemaining?: number;
}

/**
 * Live-reads the on-device profile + pregnancy and derives week/trimester.
 * Returns loading=true until the first IndexedDB read resolves.
 */
export function useProfile(): ProfileState {
  const data = useLiveQuery(async () => {
    const profile = await db().profile.toArray();
    const pregnancy = await db().pregnancy.toArray();
    return {
      profile: profile[0] ?? null,
      pregnancy: pregnancy[0] ?? null,
    };
  }, []);

  if (data === undefined) {
    return { loading: true, hasProfile: false };
  }

  const { profile, pregnancy } = data;
  if (!profile || !pregnancy) {
    return { loading: false, hasProfile: false };
  }

  const week = getCurrentWeek(pregnancy.lmpDate);
  return {
    loading: false,
    hasProfile: true,
    department: profile.department,
    city: profile.city,
    nextAppointment: profile.nextAppointment,
    lmpDate: pregnancy.lmpDate,
    dueDate: pregnancy.dueDate,
    week,
    trimester: getTrimester(week),
    daysRemaining: getDaysRemaining(pregnancy.lmpDate),
  };
}
