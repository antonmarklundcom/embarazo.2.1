import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LAPSE_DAYS,
  LAPSE_NUDGE_SERVER_READY,
  LAPSE_OPT_IN_KEY,
  LAST_OPEN_KEY,
  lapseNudgeOptedIn,
  lapseNudgeTime,
  lapseTimes,
  readLastOpen,
  recordAppOpen,
  setLapseNudgeOptIn,
} from "./lapse";

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("lapseNudgeTime", () => {
  it("lands 14 calendar days after the last open, at 10:00 local", () => {
    expect(LAPSE_DAYS).toBe(14);
    expect(lapseNudgeTime(at(2026, 11, 4, 21, 37))).toBe(at(2026, 11, 18, 10));
    expect(lapseNudgeTime(at(2026, 11, 4, 7, 5))).toBe(at(2026, 11, 18, 10));
  });

  it("crosses a month boundary on the calendar", () => {
    expect(lapseNudgeTime(at(2026, 12, 25, 12))).toBe(at(2027, 1, 8, 10));
  });
});

describe("lapseTimes", () => {
  const lastOpen = at(2026, 11, 4, 9);

  it("is off unless she opted in", () => {
    expect(lapseTimes(lastOpen, false, lastOpen)).toEqual([]);
  });

  it("is one entry at most, and never in the past", () => {
    expect(lapseTimes(lastOpen, true, lastOpen)).toEqual([at(2026, 11, 18, 10)]);
    expect(lapseTimes(lastOpen, true, at(2026, 11, 18, 10, 1))).toEqual([]);
  });

  it("has no anchor without a recorded open", () => {
    expect(lapseTimes(null, true)).toEqual([]);
  });
});

describe("the last-open clock", () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses new keys under the mibebe. prefix", () => {
    expect(LAST_OPEN_KEY).toBe("mibebe.push.lastOpenAt");
    expect(LAPSE_OPT_IN_KEY).toBe("mibebe.push.lapse");
  });

  it("resets on every open, so the nudge keeps moving while she uses the app", () => {
    const first = recordAppOpen(at(2026, 11, 4, 9));
    expect(first).toBe(at(2026, 11, 18, 10));
    const second = recordAppOpen(at(2026, 11, 15, 20));
    expect(second).toBe(at(2026, 11, 29, 10));
    expect(readLastOpen()).toBe(at(2026, 11, 15, 20));
    expect(lapseTimes(readLastOpen(), true, at(2026, 11, 20))).toEqual([at(2026, 11, 29, 10)]);
  });

  it("treats a damaged value as no anchor", () => {
    storage.set(LAST_OPEN_KEY, "not-a-number");
    expect(readLastOpen()).toBeNull();
  });

  it("defaults the opt-in to off and remembers her choice", () => {
    expect(lapseNudgeOptedIn()).toBe(false);
    setLapseNudgeOptIn(true);
    expect(lapseNudgeOptedIn()).toBe(true);
    setLapseNudgeOptIn(false);
    expect(lapseNudgeOptedIn()).toBe(false);
  });

  it("never throws when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    });
    expect(() => recordAppOpen(at(2026, 11, 4))).not.toThrow();
    expect(readLastOpen()).toBeNull();
    expect(lapseNudgeOptedIn()).toBe(false);
  });
});

describe("not live until the server can store it", () => {
  it("stays hidden: the reminder category is a MySQL enum and needs a migration", () => {
    expect(LAPSE_NUDGE_SERVER_READY).toBe(false);
  });
});
