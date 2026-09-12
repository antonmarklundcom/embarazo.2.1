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
//
// ---
//
// UPDATE (CI run #235, unit/v3). The three waits above are still the right
// waits, but the story they were written to explain does not survive the
// evidence, and leaving it here unqualified would send the next reader back to
// the service worker.
//
// Two things came back from that run. First, `gotoPrecached` PASSED on every
// offline navigation and the assertion after it still failed — so the precached
// document did arrive, and the `/offline` fallback theory below is ruled out,
// not merely unconfirmed. Second, the rotating cast that run included
// `new-tools.spec.ts:26`, which never goes offline, never waits for a worker,
// and never touches these helpers: it saves a favourite, reloads, and cannot
// find the button that reflects it.
//
// A spec with no service worker in it cannot be failing for a service-worker
// reason, so whatever this is, it is not (only) a precache race. What the four
// failures do share is that every missing element is rendered from IndexedDB
// after a navigation — the favourite in `new-tools`, the Guaraní nav label in
// `language` (`BottomNav` → `useT` → `useLocale` → Dexie, which falls back to
// Spanish rather than to nothing while the read is outstanding), and, for the
// two week-page specs, static server HTML that can only vanish if something
// threw and `app/(app)/error.tsx` replaced it.
//
// Those two shapes — a Dexie read that never resolves, and one that rejects —
// tell the two halves apart, and the page itself says which: a Spanish nav bar
// means the read was outstanding, "Algo salió mal" means it threw. That is
// exactly what Playwright's `error-context.md` snapshot records, so `ci.yml`
// now prints it into the job log (the traces artifact is not reachable from the
// agent sessions that debug this, which is how three runs went by without
// anyone reading one). The next red run should not need a fourth.

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
 * "element(s) not found" and nothing about a service worker in it.
 *
 * So this asserts the thing the specs actually mean by "works offline", and says
 * which document it got when it is wrong.
 *
 * It has since earned its keep by being green: on CI run #235 this passed and
 * the assertions after it still failed, which is what ruled the fallback out as
 * the cause and moved the search to IndexedDB (see the UPDATE at the top). Keep
 * it — a check that currently passes is what makes the next failure mean
 * something.
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
