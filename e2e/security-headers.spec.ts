import { test, expect } from "@playwright/test";

// K14 — the security headers, verified against a real response from the real
// production server rather than against `next.config.ts`.
//
// A source-scan test would pass on a config Next silently ignored. This is
// cheap and answers the only question worth asking: does the browser get them?

const EXPECTED: [string, RegExp][] = [
  ["content-security-policy", /frame-ancestors 'none'/],
  ["x-frame-options", /^DENY$/i],
  ["referrer-policy", /^strict-origin-when-cross-origin$/],
  ["permissions-policy", /camera=\(\)/],
  ["x-content-type-options", /^nosniff$/],
  ["strict-transport-security", /max-age=63072000/],
];

test("every response carries the security headers", async ({ request }) => {
  // A page, an API route and a static-ish route: the config applies to
  // `/:path*`, and "every response" is the claim being made.
  for (const path of ["/", "/emergencia", "/api/v1/health"]) {
    const response = await request.get(path);
    const headers = response.headers();
    for (const [name, pattern] of EXPECTED) {
      expect(headers[name], `${path} → ${name}`).toMatch(pattern);
    }
  }
});

test("the CSP ships Report-Only, and says so", async ({ request }) => {
  // Deliberate, and deliberately temporary: this app renders article bodies
  // through `dangerouslySetInnerHTML` and Next injects inline bootstrap
  // scripts, so an enforcing policy written without reading a single report is
  // a policy that blanks the app on somebody's phone. The enforcing header
  // must stay narrow (frame-ancestors) until the reports say otherwise.
  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy-report-only"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
});
