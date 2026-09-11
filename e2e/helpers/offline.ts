import { expect, type Page } from "@playwright/test";

// Going offline in a test is a race, and it was losing on CI.
//
// Three of these specs do the same thing: install the service worker, cut the
// network, then navigate to a precached `/semana/N` page and assert it renders.
// They all waited on `navigator.serviceWorker.ready` and then went offline
// immediately, which is not enough for either half of what they need:
//
//   1. `ready` resolves when a service worker is ACTIVE. It says nothing about
//      whether that worker has been given control of THIS page. Until
//      `navigator.serviceWorker.controller` is set, the page's own fetches do
//      not go through the worker at all — so the offline navigation bypasses
//      the cache and lands on a network error. `clientsClaim: true` (app/sw.ts)
//      makes control arrive, but it arrives asynchronously, and on a loaded CI
//      runner it can arrive after the test has already pulled the plug.
//
//   2. Serwist precaches during `install`, and 42 week pages plus the guías is
//      not an instant job. A worker can be active and controlling while a
//      specific entry is still being written.
//
//   3. And — the part that was still missing — a worker that has written THIS
//      test's entry can still be installing the rest of the manifest. Cutting
//      the network at that moment leaves the navigation arriving at a worker in
//      the middle of a long, CPU-bound install; it does not get served from the
//      precache and falls through to the `/offline` fallback, which renders a
//      real page and so fails the assertion with "element(s) not found" rather
//      than with anything that names the cause. That is why waiting for one URL
//      was not enough, and why the failure came back on loaded CI runners even
//      after (1) and (2) were fixed: the more the suite has going on in
//      parallel, the longer install takes, and the wider the window.
//
// The symptom was a rotating cast: `offline.spec.ts` one run,
// `language.spec.ts` and `revoked-companion.spec.ts` the next — always the same
// assertion, always "element(s) not found" on a page that is precached on
// purpose. Waiting for the three conditions the tests actually depend on, rather
// than for a proxy of them, removes the race instead of retrying it.

/**
 * Block until the service worker is done installing, controls this page, and
 * has `urls` in the cache.
 *
 * Call it before `context.setOffline(true)` in any test that then navigates to
 * a precached route.
 */
export async function waitForPrecache(
  page: Page,
  urls: string[],
): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.waitForFunction(
    async (wanted: string[]) => {
      // The worker has to be the one answering this page's fetches. Without a
      // controller the offline navigation never reaches the cache.
      if (!navigator.serviceWorker.controller) return false;

      // And it has to be FINISHED. `installing` is non-null for as long as
      // Serwist is still writing the manifest, and `waiting` for a worker that
      // has installed but not taken over. Either one means the next navigation
      // is racing a worker that is still busy — which is the whole failure.
      const registration = await navigator.serviceWorker.ready;
      if (registration.installing || registration.waiting) return false;

      for (const url of wanted) {
        // `ignoreSearch`: precache keys carry a `__WB_REVISION__` parameter,
        // so an exact-URL match would never hit.
        const hit = await caches.match(new Request(url), { ignoreSearch: true });
        if (!hit) return false;
      }
      return true;
    },
    urls,
    // Generous on purpose. This is the one wait in the suite that is allowed to
    // be slow: precaching ~55 routes on a shared CI runner with two workers
    // competing for it is genuinely not fast, and a ceiling that trips under
    // load is indistinguishable from the bug it is here to prevent.
    { timeout: 60_000 },
  );
}

/**
 * Navigate to a precached route and assert the precached page is what arrived.
 *
 * `page.goto()` succeeding is not the same as the precache having answered. When
 * no route matches, or the handler rejects, `app/sw.ts`'s `fallbacks` entry
 * serves `/offline` — at the requested URL, with a 200, as a perfectly real
 * page. The test then fails on whatever text it was looking for, with
 * "element(s) not found" and nothing about a service worker in it. Three CI runs
 * have now been spent working out that that is what happened.
 *
 * So this asserts the thing the specs actually mean by "works offline", and says
 * which document it got when it is wrong.
 */
export async function gotoPrecached(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  const title = await page.title();

  expect(
    title,
    `Navigating to ${url} offline was answered by the /offline fallback ` +
      `instead of the precache (status ${response?.status() ?? "none"}). ` +
      `The service worker either matched no route for this URL or its handler ` +
      `rejected — see app/sw.ts.`,
  ).not.toMatch(/Sin conexión|offline/i);
}
