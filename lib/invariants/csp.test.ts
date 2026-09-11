import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// V1 — the Content-Security-Policy is enforced, and stays enforced.
//
// `e2e/security-headers.spec.ts` and `e2e/csp.spec.ts` are the real proof:
// they read the header off a live production response and watch a real
// browser for violations. This file exists for the failure mode those two
// cannot catch cheaply — somebody editing `next.config.ts` in a hurry, adding
// `Content-Security-Policy-Report-Only` back "just while I debug this", or
// widening `script-src` to a wildcard to make a third-party snippet work, and
// nobody running Playwright before the merge.
//
// So it reads the config as text on purpose. It is not asserting what Next
// does with the file; it is asserting what is written in it, which is the
// thing a reviewer would otherwise have to notice by eye.

const CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

/** The `script-src` line as written in the policy array. */
function scriptSrcLine(): string {
  const match = CONFIG.match(/"script-src[^"]*"/);
  expect(match, "next.config.ts no longer declares a script-src").not.toBeNull();
  return match![0];
}

describe("the CSP is enforced, not reported", () => {
  it("ships no Report-Only header", () => {
    // Report-Only beside an enforced policy is the worst of both: nobody reads
    // the reports, and the header bill is paid twice. The promotion happened;
    // this is what makes it stick.
    expect(
      CONFIG,
      "Content-Security-Policy-Report-Only is back in next.config.ts. The " +
        "policy was promoted to enforcing in V1 — if it needs loosening, " +
        "loosen the enforced policy and say which feature needed it.",
    ).not.toContain("Content-Security-Policy-Report-Only");
  });

  it("declares exactly one Content-Security-Policy header", () => {
    // Two CSP headers do not merge, they intersect, and the intersection of
    // two hand-written policies is a policy nobody can reason about. This is
    // why `frame-ancestors` moved inside the one policy rather than staying in
    // a header of its own.
    const occurrences = CONFIG.match(/key: "Content-Security-Policy"/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("keeps the directives that cost nothing and close real attacks", () => {
    // None of these three needs a nonce, a refactor or a third-party change,
    // and each closes something specific: a Flash-era plugin vector, a `<base>`
    // tag injected into an article body rewriting every relative URL on the
    // page, and framing "borrar mi cuenta" into a transparent overlay.
    for (const directive of [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(CONFIG, `the policy no longer contains ${directive}`).toContain(
        directive,
      );
    }
  });

  it("has no wildcard host in script-src", () => {
    // `'unsafe-inline'` is the documented residual (Next's bootstrap, no
    // nonce, no middleware). A *host* wildcard is a different thing entirely:
    // it means an outside origin can put executable code on a page that
    // renders somebody's pregnancy.
    expect(
      scriptSrcLine(),
      "script-src has gained a wildcard. 'unsafe-inline' is the residual we " +
        "accept; an external script host is not.",
    ).not.toContain("*");
  });

  it("does not weaken script-src with 'unsafe-eval' or a data: source", () => {
    // Both turn a string into code, which is the one thing the residual above
    // is not supposed to buy.
    const line = scriptSrcLine();
    expect(line).not.toContain("unsafe-eval");
    expect(line).not.toContain("data:");
  });
});
