import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCompletedGestation, getCurrentWeek, getDaysRemaining } from "./pregnancy";

let windowEvents: EventTarget;
let documentEvents: EventTarget & { visibilityState: string };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("TZ", "America/Asuncion");
  vi.setSystemTime(new Date(2026, 9, 23, 23, 59, 59));
  windowEvents = new EventTarget();
  documentEvents = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("window", windowEvents);
  vi.stubGlobal("document", documentEvents);
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("shared calendar clock", () => {
  it("publishes the same midnight to all consumers without database/network writes", async () => {
    const { calendarSnapshot, subscribeCalendarClock } = await import("./calendarClock");
    const seenA: number[] = [];
    const seenB: number[] = [];
    const stopA = subscribeCalendarClock(() => seenA.push(calendarSnapshot()));
    const stopB = subscribeCalendarClock(() => seenB.push(calendarSnapshot()));
    seenA.length = 0;
    const lmp = new Date(2026, 9, 17).getTime();
    expect(getCurrentWeek(lmp, calendarSnapshot())).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(seenA).toEqual(seenB);
    expect(seenA).toHaveLength(1);
    expect(getCurrentWeek(lmp, calendarSnapshot())).toBe(2);
    expect(getCompletedGestation(lmp, calendarSnapshot())).toEqual({ weeks: 1, days: 0 });
    expect(getDaysRemaining(lmp, calendarSnapshot())).toBe(273);
    stopA();
    expect(vi.getTimerCount()).toBe(1);
    stopB();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["focus", "pageshow", "visibilitychange"])("refreshes on %s after suspended timers", async (event) => {
    const { calendarSnapshot, subscribeCalendarClock } = await import("./calendarClock");
    const listener = vi.fn();
    const stop = subscribeCalendarClock(listener);
    vi.setSystemTime(new Date(2026, 9, 25, 8));
    (event === "visibilitychange" ? documentEvents : windowEvents).dispatchEvent(new Event(event));
    expect(calendarSnapshot()).toBe(Date.now());
    stop();
  });

  it("detects foreground zone changes and skips ordinary same-date heartbeats", async () => {
    const { calendarSnapshot, subscribeCalendarClock } = await import("./calendarClock");
    const listener = vi.fn();
    const stop = subscribeCalendarClock(listener);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    windowEvents.dispatchEvent(new Event("focus"));
    listener.mockClear();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(listener).not.toHaveBeenCalled();
    vi.stubEnv("TZ", "America/New_York");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(listener).toHaveBeenCalledOnce();
    expect(calendarSnapshot()).toBe(Date.now());
    stop();
  });
});
