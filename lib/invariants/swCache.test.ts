import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// K14 — the service worker must never cache a session-scoped response.
//
// The bug this exists to prevent regressing: `defaultCache` from
// @serwist/next has a same-origin `NetworkFirst` rule for `/api/*`, so every
// answer scoped to whoever was signed in was written into the `apis` cache and
// served from it afterwards. Revoke a companion, put the phone in aeroplane
// mode, reload — the week, the due date and the baby's name came straight back
// out. K2's "revocation cuts everything instantly" was true of the server and
// false of the phone.
//
// The fix is two `NetworkOnly` rules in `app/sw.ts`. The failure mode of the
// fix is somebody adding the *next* session-bearing route and not adding it to
// the pattern — at which point the leak is back, silently, for that route
// only. So this test does not check that the rules exist. It works out which
// routes read a session, from their own source, and requires the pattern to
// cover each one.
//
// Adding `/api/v1/whatever` with a `getSession()` in it now fails here until
// `SESSION_BEARING_API` is widened. That is the entire point.

const SW = readFileSync(join(process.cwd(), "app", "sw.ts"), "utf8");
const API_ROOT = join(process.cwd(), "app", "api", "v1");

/** Read a regex literal back out of the service worker's source. */
function patternFrom(name: string): RegExp {
  const match = SW.match(
    new RegExp(`export const ${name}\\s*=\\s*(/.*/)\\s*;`),
  );
  if (!match) throw new Error(`${name} is not exported from app/sw.ts`);
  const literal = match[1]!;
  const lastSlash = literal.lastIndexOf("/");
  return new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));
}

const SESSION_BEARING_API = patternFrom("SESSION_BEARING_API");
const PRIVATE_NAVIGATION = patternFrom("PRIVATE_NAVIGATION");

/** Every `route.ts` under app/api/v1, as the URL path it answers on. */
function apiRoutes(): { path: string; file: string }[] {
  const found: { path: string; file: string }[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        // A dynamic segment stands in for any value it could take.
        walk(full, `${prefix}/${entry.replace(/^\[(\.\.\.)?(.+)\]$/, "x")}`);
      } else if (entry === "route.ts") {
        found.push({ path: prefix, file: full });
      }
    }
  };
  walk(API_ROOT, "/api/v1");
  return found;
}

const ROUTES = apiRoutes();

/**
 * A route is session-bearing if its own source reads the session.
 *
 * Deliberately a property of the code rather than a list kept here: a list
 * would be the thing that goes stale, which is the failure being prevented.
 */
function readsSession(file: string): boolean {
  const source = readFileSync(file, "utf8");
  return /\bgetSession\s*\(/.test(source) || /\brequireAdmin\s*\(/.test(source);
}

describe("the service worker cannot cache a session-scoped response", () => {
  it("found the API routes to check", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(10);
  });

  it("covers every API route that reads a session", () => {
    const leaking = ROUTES.filter(
      (route) => readsSession(route.file) && !SESSION_BEARING_API.test(route.path),
    ).map((route) => route.path);

    expect(
      leaking,
      "These routes read a session but are not NetworkOnly in app/sw.ts, so " +
        "defaultCache will cache their responses and serve them after access " +
        "is revoked. Add them to SESSION_BEARING_API.",
    ).toEqual([]);
  });

  it("does not throw away caching for routes that have no session", () => {
    // The other direction matters too: /api/v1/directory and
    // /api/v1/placements are the same for everyone and are what makes the
    // directory work offline. Marking them NetworkOnly would be a quiet
    // offline regression, so the pattern must NOT match them.
    for (const path of ["/api/v1/directory", "/api/v1/placements", "/api/v1/health"]) {
      expect(SESSION_BEARING_API.test(path), path).toBe(false);
    }
  });

  it("covers the pages that render those answers, and only those", () => {
    for (const path of ["/familia", "/cuenta", "/ajustes", "/admin", "/admin/usuarios/abc"]) {
      expect(PRIVATE_NAVIGATION.test(path), path).toBe(true);
    }
    // The 42 week pages and the guías are public content and are precached on
    // purpose. If this ever starts matching them, the app stops working
    // offline, which is most of what it is for.
    for (const path of ["/", "/semana/31", "/guias/parto", "/herramientas/comer", "/emergencia"]) {
      expect(PRIVATE_NAVIGATION.test(path), path).toBe(false);
    }
  });

  it("puts the NetworkOnly rules before defaultCache", () => {
    // Serwist takes the first matching rule. Below `...defaultCache` these
    // rules are unreachable and the leak is back with the tests still green.
    const first = SW.indexOf("SESSION_BEARING_API.test(url.pathname)");
    const second = SW.indexOf("PRIVATE_NAVIGATION.test(url.pathname)");
    // `lastIndexOf`: the prose above the constants names `...defaultCache`
    // too, and matching the comment would compare the rules against a
    // sentence rather than against the spread that actually follows them.
    const fallback = SW.lastIndexOf("...defaultCache");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(-1);
    expect(first).toBeLessThan(fallback);
    expect(second).toBeLessThan(fallback);
  });
});
