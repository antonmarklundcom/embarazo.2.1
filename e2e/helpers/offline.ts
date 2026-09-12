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
// UPDATE (CI run #235 on unit/v3, then the first run of PR #100). The three
// waits above are still the right waits, but the story they were written to
// explain is wrong, and leaving it here unqualified would send the next reader
// back to the service worker.
//
// Run #235 gave two clues. `gotoPrecached` passed on every offline navigation
// while the assertion after it still failed. And the rotating cast that run
// included `new-tools.spec.ts:26`, which never goes offline, never waits for a
// worker and never touches these helpers: it saves a favourite, reloads, and
// cannot find the button that reflects it. A spec with no service worker in it
// cannot be failing for a service-worker reason, so whatever this is, it is not
// a precache race.
//
// That much was right. The conclusion drawn from it — that the precached
// document had arrived and the missing elements were therefore IndexedDB reads
// that had not resolved — was not. It rested on `gotoPrecached` passing, and at
// the time `gotoPrecached` only checked that the title was not the `/offline`
// page. Any other page of the app passes that check.
//
// PR #100 added the `error-context.md` dump to `ci.yml`, the very next run went
// red on `revoked-companion.spec.ts:213`, and the snapshot settled it. The page
// at `/semana/24` was the HOME screen: "10 SEMANAS · 1.º TRIMESTRE", a link to
// `/semana/11`, "Accesos rápidos", the bottom nav on "Hoy". Not the week page,
// not the `/offline` fallback, and not `app/(app)/error.tsx` either.
//
// So the shape is a NAVIGATION, not a missing element: the document loads and
// then the app goes somewhere else. `gotoPrecached` now checks the URL as well
// as the title, so this names itself from here on.
//
// What is still open is what does the navigating. The hypothesis worth testing
// first — and it is a hypothesis, not a finding — is a guard that sends a
// visitor home when it believes there is no profile, reaching that belief while
// the Dexie read behind it is still outstanding. That would unify all four
// specs, `new-tools` included: a reload that lands on home has no favourite
// button on it either. It would also explain why the home screen in that
// snapshot showed 10 semanas rather than the companion's Semana 24 — a default,
// not the row. Confirm it against the guard before acting on it.

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
 * Navigate to a precached route and assert the page you asked for is the page
 * you got.
 *
 * `page.goto()` succeeding is not the same as arriving. Two different things
 * can answer instead, and they are told apart by different evidence:
 *
 *  - **The `/offline` fallback.** When no route matches, or the handler
 *    rejects, `app/sw.ts`'s `fallbacks` entry serves `/offline` at the
 *    requested URL with a 200 — a perfectly real page. The URL is unchanged,
 *    so only the title gives it away.
 *  - **A different page of the app.** Something navigated away after the
 *    document loaded. The title is a normal app title, so a title check that
 *    only looks for "offline" waves it through; the URL is what catches it.
 *
 * Checking only the first is what let CI run #235 be misread (see the UPDATE at
 * the top of this file): that check passed, which was taken to mean the
 * precached week page had arrived and the bug was downstream of it. Run #236 on
 * PR #100 printed the page, and it was the HOME screen — 10 semanas, "Accesos
 * rápidos", nav on "Hoy" — at a URL the test had asked to be `/semana/24`. The
 * precached document had never been established as having arrived at all.
 *
 * So both are checked, and each failure says which one happened.
 */
export async function gotoPrecached(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  const status = response?.status() ?? "none";
  const title = await page.title();

  expect(
    title,
    `Navigating to ${url} offline was answered by the /offline fallback ` +
      `instead of the precache (status ${status}). The service worker either ` +
      `matched no route for this URL or its handler rejected — see app/sw.ts.`,
  ).not.toMatch(/Sin conexión|offline/i);

  // Same origin, so compare pathnames: a redirect to "/" is the shape seen on
  // CI, and `toHaveURL` with a string would also have to carry the baseURL.
  expect(
    new URL(page.url()).pathname,
    `Navigating to ${url} offline landed somewhere else (status ${status}, ` +
      `title ${JSON.stringify(title)}). The document loaded and then the app ` +
      `navigated away — this is a client-side redirect, not a service worker ` +
      `miss, and the assertions after this one will fail on text that is ` +
      `missing because the wrong screen is showing.`,
  ).toBe(new URL(url, page.url()).pathname);
}
