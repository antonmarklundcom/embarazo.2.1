import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import {
  ACCOUNT_NUDGE_MIN_PROFILE_AGE_DAYS,
  ACCOUNT_NUDGE_SNOOZE_DAYS,
  dismissAccountNudge,
  isAccountNudgeDismissed,
  shouldShowAccountNudge,
} from "./accountNudge";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-16T00:00:00Z");

describe("shouldShowAccountNudge", () => {
  it("never shows for a signed-in user, even with old local data", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW - 100 * DAY_MS,
        hasSession: true,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("never shows when sign-in isn't offered in this deployment", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW - 100 * DAY_MS,
        hasSession: false,
        authAvailable: false,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("never shows for a brand-new profile (no usage yet)", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW,
        hasSession: false,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("stays hidden just under the age threshold", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW - (ACCOUNT_NUDGE_MIN_PROFILE_AGE_DAYS * DAY_MS - 1),
        hasSession: false,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("shows once the profile reaches the age threshold, local-only, auth available", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW - ACCOUNT_NUDGE_MIN_PROFILE_AGE_DAYS * DAY_MS,
        hasSession: false,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("shows for a much older local-only profile too", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: NOW - 90 * DAY_MS,
        hasSession: false,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("never shows with no profile at all", () => {
    expect(
      shouldShowAccountNudge({
        profileCreatedAt: undefined,
        hasSession: false,
        authAvailable: true,
        now: NOW,
      }),
    ).toBe(false);
  });
});

// `environment: "node"` (vitest.config.mts) gives this file no `window` at
// all, unlike the browser these functions are written for. A minimal
// in-memory stub — not jsdom, which the plain unit-test project deliberately
// does not carry — is the smallest thing that lets `typeof window ===
// "undefined"` read as "we are in the browser" the way `test/db/setup.ts`
// does the same for `lib/db.ts`.
function makeMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe("dismissal persistence", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {
      localStorage: makeMemoryStorage(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it("is not dismissed before anyone dismisses it", () => {
    expect(isAccountNudgeDismissed(NOW)).toBe(false);
  });

  it("is dismissed immediately after dismissing", () => {
    dismissAccountNudge(NOW);
    expect(isAccountNudgeDismissed(NOW)).toBe(true);
  });

  it("reappears once the snooze window has passed", () => {
    dismissAccountNudge(NOW);
    const justBefore = NOW + ACCOUNT_NUDGE_SNOOZE_DAYS * DAY_MS - 1;
    const justAfter = NOW + ACCOUNT_NUDGE_SNOOZE_DAYS * DAY_MS + 1;
    expect(isAccountNudgeDismissed(justBefore)).toBe(true);
    expect(isAccountNudgeDismissed(justAfter)).toBe(false);
  });

  it("degrades to 'not dismissed' when localStorage throws (private mode)", () => {
    const win = (globalThis as unknown as { window: { localStorage: Storage } }).window;
    vi.spyOn(win.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isAccountNudgeDismissed(NOW)).toBe(false);
  });

  it("swallows a write failure instead of throwing", () => {
    const win = (globalThis as unknown as { window: { localStorage: Storage } }).window;
    vi.spyOn(win.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => dismissAccountNudge(NOW)).not.toThrow();
  });
});
