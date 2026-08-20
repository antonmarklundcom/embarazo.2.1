import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// K14 — the test the task exists for.
//
// K2 shipped with a promise: "revocation still cuts everything instantly", and
// the DECISIONS.md entry says the companion view "is fetched and never cached,
// which is what keeps revocation instant". That was true of the code K2 wrote
// and false of the app it shipped inside. `defaultCache` from @serwist/next
// has a same-origin NetworkFirst rule for `/api/*` and another for
// navigations, so the service worker was quietly keeping the last good answer.
// Revoke a companion, put the phone in aeroplane mode, open the app: the week,
// the due date and the baby's name came back out of the cache.
//
// That is the whole failure, in the place it matters most — an ex-partner who
// has been removed from a pregnancy, holding a phone that still shows it.
//
// So this spec does the sequence: see it, lose access, go offline, see nothing.
// It asserts the cache directly as well as the screen, because a screen can be
// blank for the wrong reason (a slow render, a changed heading) while the
// answer sits in a Cache Storage entry waiting for the next reader.

interface View {
  pregnancyId: string;
  role: "owner" | "partner" | "family";
  snapshot: {
    week: number | null;
    dueDate: number | null;
    nextAppointmentAt: number | null;
    babyName: string | null;
    updatedAt: number;
  } | null;
  tasks?: { itemKey: string; doneAt: number | null; updatedAt: number }[];
}

const NOW = Date.now();
const BABY = "Milena";

function partnerView(): View {
  return {
    pregnancyId: "preg-1",
    role: "partner",
    snapshot: {
      week: 24,
      dueDate: NOW + 100 * 86400000,
      nextAppointmentAt: NOW + 5 * 86400000,
      babyName: BABY,
      updatedAt: NOW,
    },
    tasks: [],
  };
}

/**
 * A sharing server whose answer can be revoked between requests.
 *
 * `revoked` makes GET answer the way the real route answers a stranger: a 401
 * with no views. That is the state under test — not "the server is down", but
 * "the server says no", which is what a revoked companion actually meets.
 */
function revocableSharing() {
  const state = { revoked: false, offline: false, requests: 0 };

  const install = async (context: BrowserContext) => {
    // Matched by pathname, not by the `**/api/v1/sharing**` glob the other
    // specs use. Next names a build chunk
    // `/_next/static/chunks/app/api/v1/sharing/route-<hash>.js`, so the glob
    // also intercepts that chunk and serves it this JSON — which the service
    // worker then precaches, and which this spec would then find and report as
    // a leak. The false positive is only visible in a spec that inspects the
    // cache, which is why it has gone unnoticed until now.
    await context.route(
      (url) => url.pathname === "/api/v1/sharing",
      async (route) => {
      state.requests += 1;
      // `context.setOffline(true)` does not reach a request Playwright is
      // fulfilling itself — the stub would keep answering a phone with no
      // signal, and the service worker would never fall through to its cache,
      // which is the exact path under test. So "offline" is modelled here, at
      // the wire, the way the browser would see it.
      if (state.offline) return route.abort("internetdisconnected");
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: state.revoked ? 401 : 200,
          contentType: "application/json",
          body: JSON.stringify(state.revoked ? { error: "sin acceso" } : { ok: true }),
        });
      }
      if (state.revoked) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "sesión requerida" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ views: [partnerView()] }),
      });
      },
    );
  };

  return { state, install };
}

/** Everything Cache Storage is holding, as `[cacheName, url]` pairs. */
async function cachedUrls(page: Page): Promise<[string, string][]> {
  return page.evaluate(async () => {
    const out: [string, string][] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) out.push([name, request.url]);
    }
    return out;
  });
}

test("a revoked companion gets nothing back from the service worker cache", async ({
  browser,
}) => {
  const server = revocableSharing();
  const context = await browser.newContext();
  await server.install(context);
  const page = await context.newPage();

  // 1. He accepts, and sees a real companion screen. This is the state that
  //    used to get cached.
  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Semana 24" })).toBeVisible();
  await expect(page.getByText(BABY)).toBeVisible();

  // The service worker has to be installed and controlling before "offline"
  // means anything — otherwise this passes for the boring reason.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Semana 24" })).toBeVisible();

  // 2. Nothing about her pregnancy is in Cache Storage, before we even get to
  //    revocation. This is the assertion that fails without the NetworkOnly
  //    rules in app/sw.ts, on the very first pass.
  const cached = await cachedUrls(page);
  // By pathname, not substring: the precache legitimately holds a build chunk
  // named `.../chunks/app/api/v1/sharing/route-<hash>.js`, which is compiled
  // code, identical for every user, and not an answer about anybody.
  const sharing = cached.filter(
    ([, url]) => new URL(url).pathname === "/api/v1/sharing",
  );
  expect(
    sharing,
    "the companion snapshot is in Cache Storage, so revoking access cannot " +
      "cut it — see SESSION_BEARING_API in app/sw.ts",
  ).toEqual([]);

  // And no cached copy of the response body anywhere else, under any name.
  for (const [name, url] of cached) {
    const body = await page.evaluate(
      async ([cacheName, entry]) => {
        const response = await (await caches.open(cacheName!)).match(entry!);
        if (!response) return "";
        try {
          return (await response.clone().text()).slice(0, 200_000);
        } catch {
          return "";
        }
      },
      [name, url] as const,
    );
    expect(body, `${name} → ${url}`).not.toContain(BABY);
  }

  // 3. Access is revoked, and the phone loses signal — the order that matters.
  //    He never gets a chance to see the 401 online.
  server.state.revoked = true;
  server.state.offline = true;
  await context.setOffline(true);

  await page.reload();

  // 4. Nothing. Not the week, not the name, not the due date. A NetworkOnly
  //    navigation that cannot reach the server falls through to /offline,
  //    which is the honest answer: this screen needs the server.
  await expect(page.getByText(BABY)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Semana 24" })).toHaveCount(0);

  await context.close();
});

test("the public content a companion is entitled to still works offline", async ({
  browser,
}) => {
  // The other half, and the reason the fix is two narrow patterns rather than
  // "stop caching". Cutting a revoked companion off must not cut everybody
  // else off from the 42 week pages, which are the same for every reader and
  // are what makes this app usable on a bus.
  const server = revocableSharing();
  const context = await browser.newContext();
  await server.install(context);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.evaluate(() => navigator.serviceWorker.ready);

  server.state.revoked = true;
  server.state.offline = true;
  await context.setOffline(true);

  await page.goto("/semana/24");
  await expect(page.getByText("Qué pasa esta semana")).toBeVisible();

  await context.close();
});
