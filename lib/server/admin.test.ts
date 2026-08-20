import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ARCHITECTURE.md §9, asserted rather than promised.
//
// "Admin sees metadata, never health content. `sync_records.payload` is not
// rendered anywhere in the panel — not for support, not for debugging. The
// panel can say '37 registros de síntomas'; it cannot say what they are."
//
// `lib/server/admin.ts` has claimed since A7 that "`admin.test.ts` fails the
// build if the word appears anywhere under `app/admin` or in this module".
// K14 found that `admin.test.ts` did not exist. The comment was the only thing
// enforcing the rule, and a comment enforces nothing.
//
// Why a source scan and not a behavioural test: the property is about what the
// panel *can* do, not what one page did on one render. A query that selects
// `payload` and then happens not to print it still puts a user's journal notes
// in a server response and one `JSON.stringify` away from a log line. The only
// version of this rule worth having is "the identifier does not appear", and
// that is a question about source text.

const ADMIN_MODULE = join(process.cwd(), "lib", "server", "admin.ts");
// K16 added a second server module behind the panel. It is on this list from
// the day it was written, which is the only time adding it is free.
const METRICS_MODULE = join(process.cwd(), "lib", "server", "adminMetrics.ts");
const ADMIN_ROUTES = join(process.cwd(), "app", "admin");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strip comments so the prose above a rule cannot satisfy or violate it. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const ADMIN_SOURCES = [ADMIN_MODULE, METRICS_MODULE, ...filesUnder(ADMIN_ROUTES)];

describe("the admin panel cannot reach health content", () => {
  it("scans a real, non-empty set of admin sources", () => {
    // Guards the guard: a rename that emptied this list would turn every
    // assertion below into a vacuous pass.
    expect(ADMIN_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(ADMIN_SOURCES.some((p) => p.endsWith("admin.ts"))).toBe(true);
    expect(ADMIN_SOURCES.some((p) => p.endsWith("adminMetrics.ts"))).toBe(true);
    expect(ADMIN_SOURCES.some((p) => p.endsWith("page.tsx"))).toBe(true);
  });

  it("never names `payload` anywhere in the panel or its module", () => {
    for (const path of ADMIN_SOURCES) {
      expect(code(path), path).not.toMatch(/\bpayload\b/);
    }
  });

  it("never names a photo object, which /admin may not reach at all", () => {
    // ARCHITECTURE.md §4.4: "/admin cannot reach a photo at all, asserted
    // against the admin source by test." This is that test.
    for (const path of ADMIN_SOURCES) {
      const source = code(path);
      expect(source, path).not.toMatch(/\bphotoBlobs\b/);
      expect(source, path).not.toMatch(/\bdownloadUrl\b/);
      expect(source, path).not.toMatch(/\bobjectKey\b/i);
    }
  });

  it("never names the tables that carry a companion's shared values", () => {
    // K2/K3 put real numbers — a weight, a kick count — into
    // `companionSnapshots`. They are health content wherever they are stored.
    for (const path of ADMIN_SOURCES) {
      const source = code(path);
      expect(source, path).not.toMatch(/\bcompanionSnapshots\b/);
      expect(source, path).not.toMatch(/\bweightGrams\b/);
      expect(source, path).not.toMatch(/\bkickCount\b/);
    }
  });

  it("gates every admin surface behind requireAdmin", () => {
    // A 404 for a non-admin (§9) is only true if something checks. Each page
    // and the actions module must call it; the layout alone is not enough,
    // because a route segment can be rendered without its parent layout's
    // work being awaited in the same request.
    for (const path of ADMIN_SOURCES) {
      // The two server modules are the thing being gated, not a gate.
      if (path === ADMIN_MODULE || path === METRICS_MODULE) continue;
      expect(code(path), path).toContain("requireAdmin");
    }
  });
});
