import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// BUILD-PLAN K16 — properties of the metrics module and its page, asserted
// against their source.
//
// These functions need a MySQL to run, so what is checked here is the set of
// properties a passing behavioural test would not notice being removed: that
// every query is an aggregate, that nothing filters by a dimension fine enough
// to isolate a person, and that the page renders no identity.
//
// `lib/server/admin.test.ts` already scans this module for `payload` and the
// photo identifiers, along with the rest of the panel.

const METRICS = readFileSync(
  join(process.cwd(), "lib", "server", "adminMetrics.ts"),
  "utf8",
);

const PAGE = readFileSync(
  join(process.cwd(), "app", "admin", "metricas", "page.tsx"),
  "utf8",
);

/** Every `.select({...})` projection in the module. */
function projections(source: string): string[] {
  return source.match(/\.select\(\{[\s\S]*?\}\)/g) ?? [];
}

describe("every query is an aggregate", () => {
  it("found the queries", () => {
    expect(projections(METRICS).length).toBeGreaterThanOrEqual(10);
  });

  it("selects only counts, sums and the grouping key", () => {
    // The rule that makes "aggregates only" structural rather than a promise
    // about rendering: if the query cannot return a row about a person, no
    // amount of careless JSX can print one.
    for (const projection of projections(METRICS)) {
      const aggregated =
        /count\(\)/.test(projection) ||
        /countDistinct\(/.test(projection) ||
        /sql<number>`sum\(/.test(projection) ||
        /max\(/.test(projection);
      expect(aggregated, `not an aggregate: ${projection}`).toBe(true);
    }
  });

  it("never selects an identifying column", () => {
    for (const projection of projections(METRICS)) {
      for (const forbidden of ["users.email", "users.name", "users.id,", "invites.code", "recordId"]) {
        expect(projection.includes(forbidden), `${forbidden} in ${projection}`).toBe(false);
      }
    }
  });
});

describe("no cohort is small enough to be a person", () => {
  it("groups only by store and role, never by a user-chosen dimension", () => {
    // "Users in Itapúa who logged a symptom this week" eventually returns one
    // row, and one row about health data is not an aggregate. Adding a
    // dimension here is a data-contract decision, not a feature request.
    const groupBys = METRICS.match(/\.groupBy\([^)]*\)/g) ?? [];
    expect(groupBys.length).toBeGreaterThan(0);
    for (const clause of groupBys) {
      const allowed = /syncRecords\.store|invites\.role/.test(clause);
      expect(allowed, `unexpected grouping: ${clause}`).toBe(true);
    }
  });

  it("does not read the department, the week or the trimester", () => {
    for (const forbidden of ["department", "trimester", "lmpDate", "dueDate"]) {
      expect(METRICS.includes(forbidden), forbidden).toBe(false);
    }
  });
});

describe("the page renders numbers, not people", () => {
  it("names no identifying field", () => {
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const forbidden of ["email", "userId", "\\.name", "avatar", "image"]) {
      expect(new RegExp(forbidden).test(code), forbidden).toBe(false);
    }
  });

  it("is gated like every other admin surface", () => {
    expect(PAGE).toContain("requireAdmin()");
    expect(PAGE).toContain('export const dynamic = "force-dynamic"');
  });

  it("says what each proxy does not mean", () => {
    // The two headline numbers are proxies — writes, not opens. A founder
    // reading "41 activas" without that caveat is acting on a different number
    // from the one on the screen.
    expect(PAGE).toContain("no a quien abrió la app");
    expect(PAGE).toContain("«seguir sin cuenta» no deja rastro");
  });
});

describe("the retention window is honest about who is eligible", () => {
  it("excludes accounts younger than the window it measures", () => {
    // Including them counts everyone who signed up yesterday as "did not
    // return", so the number falls every time the app grows — which is worse
    // than no metric, because people act on it.
    expect(METRICS).toContain("14 * DAY_MS");
    expect(METRICS).toContain("lt(users.createdAt, cutoff)");
  });
});
