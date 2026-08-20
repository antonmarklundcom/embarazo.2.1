import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ContentIdSchema,
  RecordViewSchema,
  WEEK_BUCKET_SPAN,
  dayKey,
  weekBucket,
  windowDays,
} from "./contentStats";

// BUILD-PLAN C7: "no user id, no IP retained; zod whitelist + tests like the
// other routes". The whitelist tests are the point — this is the app's only
// aggregate counter, and the pressure on it will always be to add one more
// field "just for segmentation".
//
// **K5 amended these rather than deleting them**, which is what the plan asks
// for and the right instinct anyway: the week is now allowed, deliberately and
// under §5 D2, and *every other* field is still rejected. Deleting the file
// would have thrown away the rule to change one row of it.

describe("the POST body is two fields, and no more", () => {
  it("accepts a content id alone", () => {
    // Still valid without a week: a reader in planeando mode, a companion, or
    // somebody who has not onboarded has none to send.
    expect(RecordViewSchema.safeParse({ contentId: "senales-de-alarma" }).success).toBe(
      true,
    );
  });

  it("accepts the reader's week, which K5 put back on purpose", () => {
    // J3 removed this to buy an honest "No data collected" badge. §5 D2 gave
    // the badge up, and without the week "lo más leído esta semana" means "in
    // the last seven days" rather than "by women as far along as you".
    expect(RecordViewSchema.safeParse({ contentId: "guia", week: 24 }).success).toBe(
      true,
    );
  });

  it("bounds the week to the app's own range", () => {
    // The column must not become a general-purpose integer store.
    for (const week of [0, -1, 43, 1000, 24.5, Number.NaN]) {
      expect(
        RecordViewSchema.safeParse({ contentId: "guia", week }).success,
        String(week),
      ).toBe(false);
    }
  });

  it("rejects anything that looks like an identity", () => {
    for (const extra of [
      { userId: "u1" },
      { sessionId: "s1" },
      { deviceId: "d1" },
      { ip: "1.2.3.4" },
      { department: "capital" },
      { trimester: 2 },
      // The one that would turn a week into a person.
      { day: "2026-08-20" },
      { timestamp: 1787218356226 },
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

  it("sends the content id and the week from the device, and nothing else", () => {
    // K5 amended this assertion; it used to require the body to be exactly
    // `{ contentId }`. It still pins the body's *whole* shape, which is the
    // property worth having — the failure mode here was never "somebody adds a
    // week", it is "somebody spreads a profile into the body".
    const recorder = read("components", "RecordContentView.tsx");
    const code = recorder.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).toContain("{ contentId, week }");
    expect(code).toContain("{ contentId }");
    // The two shapes above are the only two. A spread would let anything in.
    expect(code).not.toMatch(/JSON\.stringify\([^)]*\.\.\./);
    for (const forbidden of ["userId", "sessionId", "deviceId", "department", "trimester"]) {
      expect(code, forbidden).not.toContain(forbidden);
    }
  });

  it("still never sends an identity, even now that it sends a week", () => {
    // The distinction K5 rests on: a week is not an identity. `contentStats`
    // has no identity column (A1) and the row is still (week, content_id, day,
    // count). If that stops being true, this is where it shows up.
    const route = read("app", "api", "v1", "stats", "route.ts");
    for (const forbidden of ["userId", "sessionId", "deviceId", "cookie"]) {
      expect(route, forbidden).not.toContain(forbidden);
    }
  });

  it("keeps the GET parameterless, so there is one cache key for everybody", () => {
    // K5 (§7) is explicit about this: the week goes on the POST, never in a
    // URL. A `?week=` would put a health datum somewhere proxies and logs can
    // see it, and give every reader their own cache entry.
    const route = read("app", "api", "v1", "stats", "route.ts");
    const get = route.slice(
      route.indexOf("export async function GET"),
      route.indexOf("export async function POST"),
    );
    expect(get).toContain("parámetro no permitido");
    expect(get).not.toContain("searchParams.get");
  });
});

// ---------------------------------------------------------------------------
// K5 (§7) — week buckets
// ---------------------------------------------------------------------------

describe("the week bucket", () => {
  it("puts a missing week in bucket 0", () => {
    // "Not applicable", which is what the column has meant since A1.
    for (const week of [null, undefined, Number.NaN]) {
      expect(weekBucket(week as number | null | undefined)).toBe(0);
    }
  });

  it("groups weeks in spans, not one bucket each", () => {
    // 42 buckets of three rows is a payload nobody needs, and women four weeks
    // apart are reading the same things.
    expect(weekBucket(1)).toBe(weekBucket(6));
    expect(weekBucket(6)).not.toBe(weekBucket(7));
    expect(WEEK_BUCKET_SPAN).toBe(6);
  });

  it("never returns 0 for a real week, so 'no week' stays distinguishable", () => {
    for (let week = 1; week <= 42; week += 1) {
      expect(weekBucket(week), String(week)).toBeGreaterThan(0);
    }
  });

  it("clamps past the last week rather than inventing a bucket", () => {
    expect(weekBucket(60)).toBe(weekBucket(42));
  });
});
