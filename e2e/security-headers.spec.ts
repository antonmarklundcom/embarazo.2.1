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

test("the CSP is enforced, and there is exactly one of it", async ({
  request,
}) => {
  // V1 promoted the policy. The two claims worth asserting against a real
  // response are the ones a config-reading test cannot make: that Next
  // actually emitted the enforcing header (a config Next silently ignored
  // would pass a source scan), and that the Report-Only header is gone rather
  // than lingering beside it.
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy-report-only"]).toBeUndefined();

  const csp = headers["content-security-policy"]!;
  expect(csp).toBeDefined();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toContain("frame-ancestors 'none'");

  // Playwright joins repeated headers with a comma. `frame-ancestors` used to
  // ship in a second CSP header of its own; if that ever comes back, two
  // policies intersect and the result is unreadable. One header, one policy.
  expect(csp.split("default-src")).toHaveLength(2);
});

test("the enforced policy names hosts instead of scheme wildcards", async ({
  request,
}) => {
  // The Report-Only policy allowed `https:` wholesale for images and
  // connections because nobody had yet enumerated what the app actually talks
  // to. V1 enumerated it. This is the test that notices the day somebody
  // widens it back rather than adding the one host they needed.
  const csp = (await request.get("/")).headers()["content-security-policy"]!;

  const imgSrc = csp.split("; ").find((d) => d.startsWith("img-src "))!;
  expect(imgSrc).toBeDefined();
  expect(imgSrc.split(" ")).not.toContain("https:");

  const connectSrc = csp.split("; ").find((d) => d.startsWith("connect-src "))!;
  expect(connectSrc).toBeDefined();
  expect(connectSrc.split(" ")).not.toContain("https:");

  // The service worker and the video embeds each get their own directive
  // rather than riding on a loosened default.
  expect(csp).toContain("worker-src 'self'");
  expect(csp).toContain("frame-src https://www.youtube-nocookie.com");
});
