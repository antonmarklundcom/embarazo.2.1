import { describe, expect, it } from "vitest";

import { PUSH_TEST_DELAYS_MS, PUSH_TEST_NOTICE, PUSH_TEST_URL, isFreshPushTest } from "./testNotice";

describe("the test notice", () => {
  it("accepts a marker within the window, including the delayed form", () => {
    const now = 1_760_000_000_000;
    expect(isFreshPushTest(now, now)).toBe(true);
    expect(isFreshPushTest(now - Math.max(...PUSH_TEST_DELAYS_MS) - 10_000, now)).toBe(true);
  });

  it("ignores a stale, future or unreadable marker", () => {
    const now = 1_760_000_000_000;
    expect(isFreshPushTest(now - 10 * 60 * 1000, now)).toBe(false);
    expect(isFreshPushTest(now + 60_000, now)).toBe(false);
    expect(isFreshPushTest(Number.NaN, now)).toBe(false);
  });

  it("says plainly that it is a test and opens the notification settings", () => {
    expect(PUSH_TEST_NOTICE.title).toMatch(/prueba/);
    expect(PUSH_TEST_NOTICE.url).toBe(PUSH_TEST_URL);
    // Ajustes is a private, never-cached route (app/sw.ts PRIVATE_NAVIGATION).
    expect(new URL(PUSH_TEST_URL, "https://x.test").pathname).toBe("/ajustes");
  });
});
