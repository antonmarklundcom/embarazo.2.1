"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Cycle } from "./db";
import {
  averageCycleLength,
  predictNextStart,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from "./cycle";

export interface CyclesState {
  loading: boolean;
  /** Period starts, ascending by startDate. */
  cycles: Cycle[];
  /** Stored setting (default 28). */
  settingCycleLength: number;
  /** Stored setting (default 5). */
  settingPeriodLength: number;
  /** Average length observed from history, if ≥ 2 periods are recorded. */
  observedCycleLength?: number;
  /** Length used for predictions: observed if available, else the setting. */
  effectiveCycleLength: number;
  lastStart?: number;
  predictedNextStart?: number;
}

/**
 * Live-reads the on-device cycles + cycle settings (build spec §3) and derives
 * the predicted next period. All estimates — never medical advice.
 */
export function useCycles(): CyclesState {
  const data = useLiveQuery(async () => {
    const cycles = await db().cycles.orderBy("startDate").toArray();
    const settings = (await db().cycleSettings.toArray())[0] ?? null;
    return { cycles, settings };
  }, []);

  if (data === undefined) {
    return {
      loading: true,
      cycles: [],
      settingCycleLength: DEFAULT_CYCLE_LENGTH,
      settingPeriodLength: DEFAULT_PERIOD_LENGTH,
      effectiveCycleLength: DEFAULT_CYCLE_LENGTH,
    };
  }

  const { cycles, settings } = data;
  const settingCycleLength = settings?.avgCycleLength ?? DEFAULT_CYCLE_LENGTH;
  const settingPeriodLength = settings?.avgPeriodLength ?? DEFAULT_PERIOD_LENGTH;
  const observedCycleLength = averageCycleLength(
    cycles.map((c) => c.startDate),
  );
  const effectiveCycleLength = observedCycleLength ?? settingCycleLength;
  const lastStart = cycles.at(-1)?.startDate;
  const predictedNextStart =
    lastStart !== undefined
      ? predictNextStart(lastStart, effectiveCycleLength)
      : undefined;

  return {
    loading: false,
    cycles,
    settingCycleLength,
    settingPeriodLength,
    observedCycleLength,
    effectiveCycleLength,
    lastStart,
    predictedNextStart,
  };
}
