import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toDateInput } from "@/lib/appointments";

// R0-1 (docs/log/r0.md, docs/log/r0-1.md) — regression test for the "today"
// computation this page uses for the "Registrar regla" default/max date.
//
// The page used to compute it as `new Date().toISOString().slice(0, 10)`,
// which renders the UTC calendar day, not the local one. In the evening in
// Asunción (UTC-3) that returns *tomorrow's* date, which then made
// `addPeriod()`'s `if (startDate > Date.now()) return;` guard silently
// swallow the tap — nothing saved, nothing shown to the user.
//
// The page now computes it the same way `lib/appointments.ts` does —
// `toDateInput(Date.now())` — so this test pins that behavior directly
// against a mocked "now" late in the evening.
describe("calendario page's 'today' is a local calendar day", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    // Asunción, UTC-3, no DST.
    process.env.TZ = "America/Asuncion";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTZ;
  });

  it("stays on today's local date at 21:30, even though it is already tomorrow in UTC", () => {
    // 21:30 local time in Asunción on Aug 21 is 00:30 UTC on Aug 22.
    const evening = new Date(2026, 7, 21, 21, 30, 0, 0).getTime();
    vi.setSystemTime(evening);

    // The buggy expression this page used to use, kept here only to document
    // exactly what broke and prove the test would have caught it.
    const buggyUtcDate = new Date().toISOString().slice(0, 10);
    expect(buggyUtcDate).toBe("2026-08-22"); // tomorrow — the bug

    // What the page computes now.
    const today = toDateInput(Date.now());
    expect(today).toBe("2026-08-21"); // still today, correctly
  });
});
