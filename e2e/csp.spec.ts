import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// V1 — the enforced Content-Security-Policy, walked.
//
// `e2e/security-headers.spec.ts` asserts the header is *there*. This file
// asserts it is *survivable*, which is the only question that matters about a
// policy that went from Report-Only to enforcing: a directive written one word
// too narrow does not fail a header test, it blanks a screen.
//
// So every assertion here comes from the browser rather than from the config:
// a `securitypolicyviolation` listener installed before the first byte of the
// document, plus the console, on every URL in the sitemap and then on the
// flows that load the content a same-origin policy is most likely to refuse —
// `blob:` previews, `data:` renders, a cross-origin bucket, a YouTube frame,
// the service worker.
//
// **A violation found here is a policy fix, never a test relaxation.** If this
// file is ever edited to expect a violation, the edit is wrong.

/** A violation as the page reports it, flattened into one readable line. */
interface Violation {
  directive: string;
  blockedURI: string;
  documentURI: string;
}

declare global {
  interface Window {
    __cspViolations?: Violation[];
  }
}

/**
 * Start collecting violations and CSP console errors for this page.
 *
 * `addInitScript` rather than a `page.on` handler because the listener has to
 * exist before the document's own first subresource: Next's inline bootstrap
 * script runs immediately, and a violation it caused would be over before an
 * evaluate-after-load could attach anything.
 */
async function watchForViolations(page: Page): Promise<() => Violation[]> {
  const consoleViolations: Violation[] = [];

  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations!.push({
        directive: event.effectiveDirective || event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
      });
    });
  });

  // The console is the belt to that braces: a worker or a frame violation is
  // reported on its own global, whose `securitypolicyviolation` event never
  // reaches the top document's listener, but Chromium still logs it here.
  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy/i.test(text)) {
      consoleViolations.push({
        directive: "(console)",
        blockedURI: text.slice(0, 300),
        documentURI: page.url(),
      });
    }
  });

  return () => consoleViolations;
}

/** Everything collected so far, from the page and from the console. */
async function collect(
  page: Page,
  fromConsole: () => Violation[],
): Promise<Violation[]> {
  const fromPage = await page.evaluate(() => window.__cspViolations ?? []);
  return [...fromPage, ...fromConsole()];
}

function describeAll(violations: Violation[]): string {
  return violations
    .map((v) => `${v.documentURI} → ${v.directive} blocked ${v.blockedURI}`)
    .join("\n");
}

/**
 * Every path the sitemap advertises.
 *
 * Read from the running server rather than imported from `app/sitemap.ts`, so
 * that a route added to the sitemap is automatically a route this policy is
 * tested against — including the 42 week pages and every guía.
 */
async function sitemapPaths(page: Page): Promise<string[]> {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  expect(urls.length, "the sitemap came back empty").toBeGreaterThan(40);
  return [...new Set(urls.map((url) => new URL(url).pathname))];
}

test.describe("the enforced policy blocks nothing the app needs", () => {
  test("every URL in the sitemap renders with zero violations", async ({
    page,
  }) => {
    const fromConsole = await watchForViolations(page);
    const violations: Violation[] = [];

    for (const path of await sitemapPaths(page)) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      violations.push(...(await collect(page, fromConsole)));
    }

    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("the app-shell routes outside the sitemap render with zero violations", async ({
    page,
  }) => {
    const fromConsole = await watchForViolations(page);
    const violations: Violation[] = [];

    // The tool pages are deliberately absent from the sitemap (they carry no
    // organic-search value on their own) and are most of the app's client-side
    // surface, so they are exactly where a too-narrow policy would first show.
    // `/admin` is the 404 path on an unauthenticated CI run — a 404 is still a
    // rendered document with a policy on it.
    await page.goto("/herramientas", { waitUntil: "domcontentloaded" });
    const tools = await page
      .locator("main a[href^='/herramientas/']")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href")!),
      );
    expect(tools.length, "the tools grid came back empty").toBeGreaterThan(8);

    for (const path of [
      ...new Set(tools),
      "/offline",
      "/cuenta",
      "/ajustes",
      "/familia",
      "/herramientas",
      "/guias/videos",
      "/admin",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      violations.push(...(await collect(page, fromConsole)));
    }

    expect(violations, describeAll(violations)).toEqual([]);
  });
});

test.describe("the flows that load something other than same-origin HTML", () => {
  test("the service worker registers and precaches under the policy", async ({
    page,
  }) => {
    // `worker-src 'self'` is in the policy because `default-src` does not
    // reliably cover workers across engines, and a blocked service worker is
    // an app with no offline mode at all — the failure this app can least
    // afford and the one least likely to be noticed in a browser with signal.
    const fromConsole = await watchForViolations(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // `ready` resolves as soon as there is an active worker, which can still be
    // "activating" — the same race `e2e/helpers/offline.ts` documents. Poll for
    // the state rather than sampling it once; a worker the policy had blocked
    // never reaches either state, so this still fails loudly if it is blocked.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            return registration.active?.state ?? null;
          }),
        { message: "the service worker never activated under the policy" },
      )
      .toBe("activated");

    const violations = await collect(page, fromConsole);
    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("onboarding and the week screen render with zero violations", async ({
    page,
  }) => {
    const fromConsole = await watchForViolations(page);

    await completeOnboarding(page, { daysAgo: 140, babyName: "Ana" });

    const violations = await collect(page, fromConsole);
    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("the share card draws from a canvas with zero violations", async ({
    page,
  }) => {
    // E2 composites the week card in a canvas and hands it over as a download.
    // Canvas work is not a CSP surface by itself, but the card's images and
    // the object URL it produces are.
    const fromConsole = await watchForViolations(page);

    await completeOnboarding(page, { daysAgo: 140 });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Compartir mi semana" }).click();
    await download;

    const violations = await collect(page, fromConsole);
    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("a photo preview from a blob: URL is not blocked", async ({ page }) => {
    // K4's diary previews a chosen file from `URL.createObjectURL` before any
    // byte leaves the phone — `img-src blob:`. Without it the photo screen
    // shows empty frames for pictures that are sitting right there on the
    // device, which is the kind of breakage that reads as data loss.
    const fromConsole = await watchForViolations(page);

    await completeOnboarding(page, { daysAgo: 140 });
    await page.goto("/herramientas/fotos", { waitUntil: "domcontentloaded" });

    await page.locator("input[type='file']").setInputFiles({
      name: "panza.png",
      mimeType: "image/png",
      // A 1x1 PNG: enough to become a real Blob and a real object URL.
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

    // The rendered thumbnail is the assertion: a blocked `blob:` leaves an
    // <img> whose naturalWidth never becomes non-zero.
    await expect
      .poll(
        () =>
          page
            .locator("img[src^='blob:'], img[src^='data:']")
            .first()
            .evaluate((img) => (img as HTMLImageElement).naturalWidth)
            .catch(() => 0),
        { message: "the blob: preview never decoded" },
      )
      .toBeGreaterThan(0);

    const violations = await collect(page, fromConsole);
    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("the presigned upload reaches the configured bucket origin", async ({
    page,
    context,
  }) => {
    // `connect-src` names the object-storage origin read from
    // PHOTO_STORAGE_ENDPOINT (see next.config.ts); `playwright.config.ts` sets
    // it to the same stand-in bucket `photo-backup.spec.ts` stubs. This asserts
    // the one thing that arrangement exists to prove: a cross-origin presigned
    // PUT is allowed by the policy and is not silently swallowed.
    const fromConsole = await watchForViolations(page);
    const bucket = "https://bucket.example.test";

    await context.route(`${bucket}/**`, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    await page.goto("/offline", { waitUntil: "domcontentloaded" });
    const status = await page.evaluate(async (origin) => {
      try {
        const res = await fetch(`${origin}/mibebe/x.jpg`, {
          method: "PUT",
          body: new Blob(["x"]),
        });
        return res.status;
      } catch (error) {
        return String(error);
      }
    }, bucket);

    expect(
      status,
      "the presigned PUT origin is not in connect-src — photo backup would " +
        "fail on every configured deployment",
    ).toBe(200);

    const violations = await collect(page, fromConsole);
    expect(violations, describeAll(violations)).toEqual([]);
  });

  test("a cross-origin connection the policy does not name is refused", async ({
    page,
  }) => {
    // The other half of the previous test, and the reason `connect-src` stopped
    // saying `https:`. Without this, a policy that had quietly been widened
    // back to a scheme wildcard would still pass every test above.
    const fromConsole = await watchForViolations(page);

    await page.goto("/offline", { waitUntil: "domcontentloaded" });
    const outcome = await page.evaluate(async () => {
      try {
        await fetch("https://not-in-the-policy.example.test/ping");
        return "allowed";
      } catch {
        return "refused";
      }
    });
    expect(outcome).toBe("refused");

    const violations = await collect(page, fromConsole);
    expect(violations.map((v) => v.directive)).toContain("connect-src");
  });

  test("the video gallery's youtube-nocookie frame is allowed", async ({
    page,
  }) => {
    // `frame-src` exists only for this. The tile is locked until real videos
    // land (`tools-grid.spec.ts`), so the policy is checked directly rather
    // than by waiting for content that is not in the repo yet: an iframe to
    // the embed host must not raise a violation.
    const fromConsole = await watchForViolations(page);

    await page.goto("/guias/videos", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const frame = document.createElement("iframe");
          frame.src = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
          frame.addEventListener("load", () => resolve());
          frame.addEventListener("error", () => resolve());
          document.body.append(frame);
          // The embed host is unreachable from CI. The question is whether the
          // policy refused the frame, which is answered locally and at once.
          setTimeout(resolve, 3_000);
        }),
    );

    const violations = (await collect(page, fromConsole)).filter(
      (v) => v.directive === "frame-src",
    );
    expect(violations, describeAll(violations)).toEqual([]);
  });
});
