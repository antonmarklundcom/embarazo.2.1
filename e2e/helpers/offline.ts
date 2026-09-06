import type { Page } from "@playwright/test";

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
// The symptom was a rotating cast: `offline.spec.ts` one run,
// `language.spec.ts` and `revoked-companion.spec.ts` the next — always the same
// assertion, always "element(s) not found" on a page that is precached on
// purpose. Waiting for the two conditions the tests actually depend on, rather
// than for a proxy of them, removes the race instead of retrying it.

/**
 * Block until the service worker controls this page and `urls` are cached.
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
      for (const url of wanted) {
        // `ignoreSearch`: precache keys carry a `__WB_REVISION__` parameter,
        // so an exact-URL match would never hit.
        const hit = await caches.match(new Request(url), { ignoreSearch: true });
        if (!hit) return false;
      }
      return true;
    },
    urls,
    { timeout: 15_000 },
  );
}
