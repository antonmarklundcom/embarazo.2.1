"use client";

import { useSyncExternalStore } from "react";
import { calendarSnapshot, serverCalendarSnapshot, subscribeCalendarClock } from "./calendarClock";

export function useCalendarClock(): number {
  return useSyncExternalStore(subscribeCalendarClock, calendarSnapshot, serverCalendarSnapshot);
}
