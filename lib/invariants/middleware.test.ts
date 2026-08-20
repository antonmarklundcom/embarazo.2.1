import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// K13a (docs/FABLE-PLAN-2026-08.md §6) — the app has no middleware, and that
// is now an invariant rather than an accident.
//
// The reason is specific. Next.js has shipped more than one authentication
// bypass in the middleware layer (the request-header spoof of CVE-2025-29927
// being the well-known one): a request crafted to look like it had already
// been through middleware skipped it entirely. Every one of those advisories
// was survivable here for exactly one reason — there is no `middleware.ts`,
// so there is no gate in front of a route that a header can be talked out of.
//
// Instead every protected surface checks its own session server-side, in the
// handler, where the check cannot be routed around: `/admin` via
// `lib/server/admin.ts` (and a 404, not a 403 — ARCHITECTURE.md §9), the API
// routes via their own session lookups.
//
// So this file is the shield. If a later task adds `middleware.ts` to hold an
// auth check, this test fails and whoever wrote it reads this comment first.
// (Middleware for something that is *not* a security boundary is still a
// deliberate decision, not a drive-by one — it needs this test amended and a
// DECISIONS.md entry, which is the point.)

const ROOTS = [process.cwd(), join(process.cwd(), "src"), join(process.cwd(), "app")];
const EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs"];

describe("the app has no middleware", () => {
  it("has no middleware file in any location Next.js would load one from", () => {
    const found: string[] = [];
    for (const root of ROOTS) {
      if (!existsSync(root)) continue;
      for (const ext of EXTENSIONS) {
        const candidate = join(root, `middleware.${ext}`);
        if (existsSync(candidate)) found.push(candidate);
      }
    }
    expect(
      found,
      "Next.js middleware has been an auth-bypass CVE surface more than once. " +
        "This app's protected routes check the session in the handler instead. " +
        "See lib/invariants/middleware.test.ts and ARCHITECTURE.md §11.",
    ).toEqual([]);
  });

  it("carries no middleware-only options in next.config.ts", () => {
    // These two options only mean anything when middleware exists. Finding one
    // would mean a middleware file had been here, or is about to be.
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).not.toContain("skipMiddlewareUrlNormalize");
    expect(config).not.toContain("skipTrailingSlashRedirect");
  });
});
