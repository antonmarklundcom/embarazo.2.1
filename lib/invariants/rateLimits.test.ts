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

    // R0-3 prefixed /api/v1/go's key (`go:${clientKey}`), so it no longer
    // shares a bucket with anything else. Nothing is exempt here anymore.
    expect(shared).toEqual([]);
  });
});

// The limiter is not only reached from `route.ts` files. R0-3 throttled the
// Credentials `authorize()` in `lib/server/auth.ts` and the sign-up server
// action in `app/(app)/cuenta/actions.ts`, and the password-reset unit added
// `lib/server/passwordReset.ts` — none of which the sweep above can see,
// because none of them is an API route. A server action is the same public POST
// surface a route is, so the same rule has to hold there, checked the same way
// rather than trusted.

const NAMESPACED_KEY = /isRateLimited\(\s*`[a-z-]+:\$\{/;

function sourceFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
      // `route.ts` files are covered by the sweep above; `lib/rateLimit.ts` is
      // the limiter itself, where the name is a declaration, not a call.
      if (entry === "route.ts") continue;
      if (full.endsWith(join("lib", "rateLimit.ts"))) continue;
      found.push(full);
    }
  };
  walk(root);
  return found;
}

const NON_ROUTE_CALLERS = [
  ...sourceFiles(join(process.cwd(), "app")),
  ...sourceFiles(join(process.cwd(), "lib")),
]
  .map((file) => ({ file, source: readFileSync(file, "utf8") }))
  .filter(({ source }) => source.includes("isRateLimited("));

describe("every non-route caller of the limiter namespaces its key too", () => {
  it("found the known ones", () => {
    // `lib/server/auth.ts` (`auth:`), `app/(app)/cuenta/actions.ts` (`auth:`),
    // `lib/server/passwordReset.ts` (`reset:`) and
    // `lib/server/emailVerification.ts` (`verify:`). A number lower than this
    // means the sweep stopped seeing files, not that the call sites went away.
    expect(NON_ROUTE_CALLERS.length).toBeGreaterThanOrEqual(4);
  });

  it("uses a prefixed key everywhere", () => {
    const shared = NON_ROUTE_CALLERS.filter(
      ({ source }) => !NAMESPACED_KEY.test(source),
    ).map(({ file }) => file);

    expect(
      shared,
      "These files call isRateLimited with an unprefixed key, so they share " +
        "one bucket with each other. Namespace it: `something:${clientKey}`.",
    ).toEqual([]);
  });

  it("keeps password reset on a budget of its own, not sign-in's", () => {
    // Concrete rather than general: a shared `auth:` bucket would mean a
    // household hammering sign-in also burns the recovery budget of the one
    // person there who genuinely forgot her password — locking her out of the
    // only way back in.
    const reset = readFileSync(
      join(process.cwd(), "lib", "server", "passwordReset.ts"),
      "utf8",
    );
    expect(reset).toMatch(/isRateLimited\(\s*`reset:\$\{/);
    expect(reset).not.toMatch(/isRateLimited\(\s*`auth:\$\{/);
  });

  it("keeps resend-verification on a third budget, not sign-in's or reset's", () => {
    // Same argument one surface over. "Mandame el enlace de nuevo" sends mail
    // to somebody's inbox on demand, so it needs a limit of its own — and it
    // must not be the bucket that password recovery draws from, because a user
    // pressing the resend button a few times too many must not thereby lose the
    // ability to recover a forgotten password.
    const verify = readFileSync(
      join(process.cwd(), "lib", "server", "emailVerification.ts"),
      "utf8",
    );
    expect(verify).toMatch(/isRateLimited\(\s*`verify:\$\{/);
    expect(verify).not.toMatch(/isRateLimited\(\s*`auth:\$\{/);
    expect(verify).not.toMatch(/isRateLimited\(\s*`reset:\$\{/);
  });
});
