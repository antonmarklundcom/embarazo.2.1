import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ContentIdSchema,
  RecordViewSchema,
  dayKey,
  windowDays,
} from "./contentStats";

// BUILD-PLAN C7: "no user id, no IP retained; zod whitelist + tests like the
// other routes". The whitelist tests are the point — this is the app's only
// aggregate counter, and the pressure on it will always be to add one more
// field "just for segmentation".

describe("the POST body is one field", () => {
  it("accepts a content id and nothing else", () => {
    expect(RecordViewSchema.safeParse({ contentId: "senales-de-alarma" }).success).toBe(
      true,
    );
  });

  it("rejects the week, which is health data derived from the due date", () => {
    // J3 removed this parameter from three routes so the Play listing can keep
    // saying "No data collected". A new route may not put it back.
    const parsed = RecordViewSchema.safeParse({ contentId: "guia", week: 24 });
    expect(parsed.success).toBe(false);
  });

  it("rejects anything that looks like an identity", () => {
    for (const extra of [
      { userId: "u1" },
      { sessionId: "s1" },
      { deviceId: "d1" },
      { ip: "1.2.3.4" },
      { department: "capital" },
      { trimester: 2 },
    ]) {
      expect(
        RecordViewSchema.safeParse({ contentId: "guia", ...extra }).success,
        `${Object.keys(extra)[0]} must be rejected`,
      ).toBe(false);
    }
  });

  it("rejects a content id that is not one of our slugs", () => {
    for (const bad of ["", "Con Mayúsculas", "../../etc/passwd", "a".repeat(200)]) {
      expect(ContentIdSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe("the day bucket", () => {
  it("is a UTC calendar day", () => {
    expect(dayKey(new Date("2026-08-13T23:59:59Z"))).toBe("2026-08-13");
    expect(dayKey(new Date("2026-08-14T00:00:01Z"))).toBe("2026-08-14");
  });

  it("covers seven days ending today", () => {
    const days = windowDays(new Date("2026-08-13T10:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-13");
    expect(days[6]).toBe("2026-08-07");
  });

  it("crosses a month boundary correctly", () => {
    expect(windowDays(new Date("2026-03-02T10:00:00Z"))).toContain("2026-02-24");
  });
});

// ---------------------------------------------------------------------------
// Properties of the code, asserted against the source
// ---------------------------------------------------------------------------

function read(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("the counter cannot learn who", () => {
  it("never reads a session", () => {
    // Not an oversight to fix later: this counter works without an account,
    // and reading a session here would put an identity beside a counter that
    // must never have one (ARCHITECTURE.md §4.5).
    const route = read("app", "api", "v1", "stats", "route.ts");
    expect(route).not.toContain("getSession");
    expect(route).not.toContain("auth");
  });

  it("writes nothing derived from the request but the content id", () => {
    const server = read("lib", "server", "stats.ts");
    const inserts = server.match(/\.values\(\{[\s\S]*?\}\)/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const insert of inserts) {
      for (const forbidden of ["user", "session", "ip", "device", "trimester"]) {
        expect(
          insert.toLowerCase().includes(forbidden),
          `an insert in server/stats.ts must not carry "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it("sends only the content id from the device", () => {
    const recorder = read("components", "RecordContentView.tsx");
    const code = recorder.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).toContain("JSON.stringify({ contentId })");
    expect(code.toLowerCase()).not.toContain("week");
  });
});
