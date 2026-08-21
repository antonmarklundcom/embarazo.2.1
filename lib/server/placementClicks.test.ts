import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { countClick } from "./placementClicks";
import { getTableColumns } from "drizzle-orm";
import { placementClicks } from "./schema";

// FABLE-PLAN K15 — the properties a behavioural test would not notice being
// removed. `recordClick` needs a MySQL to run; what is checked here is the
// shape of what it can possibly write, and the shape of what the `/go` route
// can possibly pass it.

const MODULE = readFileSync(
  join(process.cwd(), "lib", "server", "placementClicks.ts"),
  "utf8",
);

const GO_ROUTE = readFileSync(
  join(process.cwd(), "app", "api", "v1", "go", "[id]", "route.ts"),
  "utf8",
);

/** Strip comments so the prose above a rule cannot satisfy or violate it. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("no per-user row exists by construction (§6 K15)", () => {
  it("has no user, session, device or IP column", () => {
    const columns = Object.values(getTableColumns(placementClicks)).map((c) =>
      c.name.toLowerCase(),
    );
    for (const forbidden of ["user", "session", "device", "ip", "token", "email"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `placementClicks must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
    expect(columns.sort()).toEqual(["clicks", "day", "placementid"]);
  });

  it("buckets by day, not by timestamp", () => {
    // A minute-resolution click trail on five sponsors is a session
    // reconstruction; a day bucket is a count.
    expect(Object.keys(getTableColumns(placementClicks))).toContain("day");
    expect(code(MODULE)).not.toMatch(/\bnew Date\(\)\.toISOString\(\)/);
  });

  it("names no identifying value anywhere in the module", () => {
    for (const forbidden of [
      /\buserId\b/,
      /\bsession\b/i,
      /x-forwarded-for/i,
      /\bclientKey\b/,
      /\bpayload\b/,
    ]) {
      expect(code(MODULE), String(forbidden)).not.toMatch(forbidden);
    }
  });

  it("gives the route nothing but an id and a clock to pass", () => {
    // The signature is the enforcement: a caller cannot attach a user without
    // changing it, which is the moment somebody should have to argue for it.
    expect(code(MODULE)).toMatch(
      /export function countClick\(id: string, now: Date = new Date\(\)\): void/,
    );
  });
});

describe("the /go route", () => {
  it("counts the click with the id alone", () => {
    expect(code(GO_ROUTE)).toMatch(/countClick\(id\);/);
  });

  it("does not await the count — the redirect never waits on it", () => {
    // A woman tapping WhatsApp on a sanatorio's listing is mid-errand. A
    // counter that makes that tap slower has inverted its own importance.
    expect(code(GO_ROUTE)).not.toMatch(/await\s+countClick/);
    expect(code(MODULE)).toMatch(/void recordClick\(/);
  });

  it("still forwards only the id to the Sheets mirror", () => {
    expect(code(GO_ROUTE)).toMatch(/JSON\.stringify\(\{ id, ts: Date\.now\(\) \}\)/);
  });
});

describe("without a database (§4.2)", () => {
  it("counts nothing and throws nothing", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => countClick("plc-001")).not.toThrow();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      if (previous !== undefined) process.env.DATABASE_URL = previous;
    }
  });
});
