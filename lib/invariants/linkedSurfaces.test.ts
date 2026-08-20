import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// K7 (§7) — "a shipped feature linked from nowhere is a bug."
//
// That sentence is the Fable review's sharpest finding and it was true four
// times over: `/familia` (built in E1, the growth engine, linked from nothing),
// `/herramientas/bebe-ia` (a route, a quota, a consent step, an e2e spec, no
// link), `/preguntas` (precached for offline, linked from one footer), and the
// roadmap card promising "Compartir con tu pareja — Próximamente" while
// `/familia` sat there working.
//
// Nothing in the repo could have caught any of it, because "is there a link to
// this page" is not a question any test was asking. This one asks it, for every
// route in the app, and it will catch the fifth one.

const APP = join(process.cwd(), "app", "(app)");

/** Every route the app shell renders, as a path. */
function routes(): string[] {
  const found: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, `${prefix}/${entry}`);
      else if (entry === "page.tsx" && prefix !== "") found.push(prefix);
    }
  };
  walk(APP, "");
  // Dynamic segments are reached by construction from their index page.
  return found.filter((path) => !path.includes("["));
}

/** Everything under app/ and components/, concatenated. */
function allSource(): string {
  const chunks: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        chunks.push(readFileSync(full, "utf8"));
      }
    }
  };
  walk(join(process.cwd(), "app"));
  walk(join(process.cwd(), "components"));
  return chunks.join("\n");
}

const SOURCE = allSource();
const ROUTES = routes();

// Routes that are deliberately not linked, each with the reason. An entry here
// is a decision; the absence of one is a bug.
const UNLINKED: Record<string, string> = {
  "/privacidad": "linked from the legal footer, which this scan does not model",
  "/terminos": "linked from the legal footer",
  "/conoce": "the public pre-install landing page — reached from outside the app",
  // Found by this test on its first run, and correctly not a bug: the
  // planeando dashboard is what `/` renders when the mode is active
  // (app/(app)/page.tsx), so nobody in that mode ever needs a link to it. The
  // route exists as a direct URL and its own comment says so.
  "/planeando": "rendered inline at / when mode === planeando; direct URL only",
};

describe("every screen is reachable from inside the app", () => {
  it("found the routes", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(20);
    expect(ROUTES).toContain("/familia");
    expect(ROUTES).toContain("/herramientas/bebe-ia");
    expect(ROUTES).toContain("/preguntas");
  });

  it("is named somewhere else in the app's own source", () => {
    // The check is "the path appears as a string literal somewhere in app/ or
    // components/", not `href="..."`, because half this app's links are
    // data-driven — the tools grid and the bottom nav both map over arrays of
    // `{ href, title }`. Looser than a real reachability graph, and it catches
    // the thing that actually happened four times: a page nobody mentions.
    const orphans = ROUTES.filter((route) => {
      if (route in UNLINKED) return false;
      return !SOURCE.includes(`"${route}"`);
    });

    expect(
      orphans,
      'These pages exist and nothing links to them. "A shipped feature linked ' +
        'from nowhere is a bug" (docs/FABLE-PLAN-2026-08.md §7). Add a link, ' +
        "or add an entry to UNLINKED above saying why this one is different.",
    ).toEqual([]);
  });
});

describe("the roadmap does not promise what the app already does", () => {
  const ROADMAP = readFileSync(
    join(process.cwd(), "components", "RoadmapSection.tsx"),
    "utf8",
  );
  const items = ROADMAP.slice(ROADMAP.indexOf("const ITEMS"), ROADMAP.indexOf("export function"));

  it("no longer offers sharing with a partner as 'próximamente'", () => {
    // It shipped in E1. A "próximamente" badge on a working feature is how a
    // user decides to stop looking for it.
    expect(items).not.toContain("Compartir con tu pareja");
    expect(items).not.toContain("pareja");
  });

  it("no longer offers an open community", () => {
    // §5 D5 scoped community to curated Q&A. Leaving this up would promise a
    // forum nobody intends to build.
    expect(items).not.toContain("Comunidad de mamás");
  });
});
