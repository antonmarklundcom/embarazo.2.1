import { calendarDay } from "./calendarDate";

// One clock/timer for every mounted useProfile consumer. No record, network
// or storage writes are needed for a new calendar day to reach the UI.
let snapshot = Date.now();
let snapshotDay = calendarDay(snapshot);
let snapshotOffset = new Date(snapshot).getTimezoneOffset();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function calendarSnapshot(): number {
  return snapshot;
}

export function serverCalendarSnapshot(): number {
  return 0; // profile data is still loading during static rendering/hydration
}

function refresh(force = false) {
  const now = Date.now();
  const day = calendarDay(now);
  const offset = new Date(now).getTimezoneOffset();
  const changed = day !== snapshotDay || offset !== snapshotOffset;
  if (force || changed) {
    snapshot = now;
    snapshotDay = day;
    snapshotOffset = offset;
    for (const listener of listeners) listener();
  }
}

function schedule() {
  clearTimeout(timer);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // A bounded heartbeat also notices a foreground system-clock/zone change.
  // It publishes only when the civil day/offset changes, not each minute.
  timer = setTimeout(() => {
    refresh();
    schedule();
  }, Math.max(1, Math.min(60_000, midnight.getTime() - now.getTime())));
}

function foreground() {
  if (document.visibilityState === "hidden") return;
  refresh(true);
  schedule();
}

export function subscribeCalendarClock(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh(true);
    window.addEventListener("focus", foreground);
    window.addEventListener("pageshow", foreground);
    document.addEventListener("visibilitychange", foreground);
    schedule();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(timer);
    timer = undefined;
    window.removeEventListener("focus", foreground);
    window.removeEventListener("pageshow", foreground);
    document.removeEventListener("visibilitychange", foreground);
  };
}
