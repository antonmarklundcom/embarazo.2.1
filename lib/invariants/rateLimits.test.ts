import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// K14 — "all 12 API routes are throttled".
//
// Written as a rule over the directory rather than a list of twelve, for the
// same reason as `swCache.test.ts`: a list is the thing that goes stale, and
// the route added next year is the one nobody remembers to throttle.
//
// Two routes are exempt and both say why below. Everything else has to reach
// the limiter, and a route that cannot be exempted on those grounds fails here
// until somebody either throttles it or writes down why it does not need to
// be — which is the conversation this test exists to force.

const API_ROOT = join(process.cwd(), "app", "api", "v1");

const EXEMPT: Record<string, string> = {
  // A liveness probe. Throttling it is how a monitor concludes the app is
  // down, and it reads nothing, writes nothing and returns a constant.
  "/api/v1/health": "constant response, no reads, no writes",
  // The dispatcher, called by a cron with PUSH_DISPATCH_SECRET. Its gate is
  // the shared secret; a rate limit keyed on the caller's address would
  // throttle the one caller that is supposed to hammer it.
  "/api/v1/push/dispatch": "secret-gated cron endpoint",
};

function routes(): { path: string; file: string }[] {
  const found: { path: string; file: string }[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}/${entry.replace(/^\[(\.\.\.)?(.+)\]$/, "x")}`);
      } else if (entry === "route.ts") {
        found.push({ path: prefix, file: full });
      }
    }
  };
  walk(API_ROOT, "/api/v1");
  return found;
}

const ROUTES = routes();

describe("every API route is throttled", () => {
  it("found them all", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(12);
  });

  it("reaches the limiter, or is exempt for a written reason", () => {
    const unthrottled = ROUTES.filter((route) => {
      if (route.path in EXEMPT) return false;
      return !readFileSync(route.file, "utf8").includes("isRateLimited");
    }).map((route) => route.path);

    expect(
      unthrottled,
      "These routes have no rate limit. Add one (copy the sync pattern), or " +
        "add an entry to EXEMPT above saying why this route does not need one.",
    ).toEqual([]);
  });

  it("keys the limiter per route so one busy route cannot starve another", () => {
    // `isRateLimited(clientKey)` with no prefix shares one bucket across every
    // route that does it. A device mid-sync would then be told it is doing too
    // much when it asks whether it is signed in.
    const shared = ROUTES.filter((route) => {
      const source = readFileSync(route.file, "utf8");
      if (!source.includes("isRateLimited")) return false;
      return !/isRateLimited\(\s*`[a-z-]+:\$\{/.test(source);
    }).map((route) => route.path);

    // /api/v1/go predates the convention and is the one unprefixed caller;
    // it is left alone rather than churned in a security PR.
    expect(shared).toEqual(["/api/v1/go/x"]);
  });
});
