import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// K14 — properties of `/api/v1/push`, asserted against its source.
//
// The handler imports `lib/server/auth.ts` (and therefore next-auth), which
// does not load under vitest — the same constraint `lib/photos/
// routeContract.test.ts` works around. `endpoints.test.ts` proves the
// predicate is right; this proves the route actually uses it, on both verbs,
// which is the half a passing predicate would never notice being dropped.

const ROUTE = readFileSync(
  join(process.cwd(), "app", "api", "v1", "push", "route.ts"),
  "utf8",
);

const PUSH_SERVER = readFileSync(
  join(process.cwd(), "lib", "server", "push.ts"),
  "utf8",
);

describe("the endpoint is whitelisted before it is stored", () => {
  it("refines both schemas, not just the subscribe one", () => {
    // DELETE takes an endpoint too. An unvalidated one there is a different
    // shape of the same mistake: a string that reaches a database query.
    const refinements = ROUTE.match(/\.refine\(isAllowedPushEndpoint/g) ?? [];
    expect(refinements.length).toBe(2);
  });

  it("does not accept a bare URL string anywhere", () => {
    // `z.string().url()` on its own is what the route used to do, and it is
    // exactly as happy with http://169.254.169.254/ as with FCM.
    const bare = ROUTE.match(/z\.string\(\)\.url\(\)\.max\(512\)(?!\s*\.refine)/g);
    expect(bare, "an endpoint field is parsed but not whitelisted").toBeNull();
  });
});

describe("the route is throttled on every verb that writes", () => {
  it("checks the limiter in POST and DELETE", () => {
    for (const verb of ["POST", "DELETE"]) {
      const start = ROUTE.indexOf(`export async function ${verb}(`);
      expect(start, verb).toBeGreaterThan(-1);
      const body = ROUTE.slice(start, start + 400);
      expect(body, verb).toContain("throttled(req)");
    }
  });

  it("keys the limiter per route, not globally", () => {
    // A shared key would let a device syncing hard lock itself out of its own
    // notifications, which is a bug that looks like a broken feature.
    expect(ROUTE).toContain("`push:${clientKeyFromHeaders(req.headers)}`");
  });
});

describe("an anonymous replay cannot un-own a subscription", () => {
  it("coalesces userId on duplicate key instead of overwriting it", () => {
    const start = PUSH_SERVER.indexOf("export async function saveSubscription");
    const body = PUSH_SERVER.slice(start, PUSH_SERVER.indexOf("\n}", start));
    const update = body.slice(body.indexOf("onDuplicateKeyUpdate"));
    expect(update).toContain("coalesce(");
    // The bug, spelled out: a plain assignment here is what let an anonymous
    // POST carrying a known endpoint null out that row's owner — and a
    // subscription with a null userId is one A5's account deletion can never
    // find again.
    expect(update).not.toMatch(/userId:\s*input\.userId/);
  });

  it("still writes the userId on the initial insert", () => {
    // Coalescing on update must not be mistaken for "never store the owner".
    const start = PUSH_SERVER.indexOf("export async function saveSubscription");
    const values = PUSH_SERVER.slice(start, PUSH_SERVER.indexOf("onDuplicateKeyUpdate", start));
    expect(values).toContain("userId: input.userId");
  });
});
