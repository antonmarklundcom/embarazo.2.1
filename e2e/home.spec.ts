import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// U11 — the home screen now mounts U3's Recomendados rail directly (U3 built
// it self-gating but unmounted anywhere). Same mocking pattern
// e2e/recomendados.spec.ts already uses for /api/v1/flags, since CI has no
// database to serve a real flag row from.

async function mockRecomendadosFlag(page: import("@playwright/test").Page, on: boolean) {
  await page.route("**/api/v1/flags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recomendados: on }),
    }),
  );
}

test("flag off: no Recomendados rail on the home screen", async ({ page }) => {
  await mockRecomendadosFlag(page, false);
  await completeOnboarding(page, { daysAgo: 70 });

  await expect(page.locator("#recomendados")).toHaveCount(0);
});

test("flag on: the Recomendados rail renders on the home screen", async ({
  page,
}) => {
  await mockRecomendadosFlag(page, true);
  await completeOnboarding(page, { daysAgo: 70 });

  await expect(page.locator("#recomendados")).toBeVisible();
  // Stage 0 (shown at every trimester), same fixture e2e/recomendados.spec.ts
  // already asserts against.
  await expect(
    page.getByRole("heading", { name: "Números de emergencia, siempre a mano" }),
  ).toBeVisible();
});

// The account nudge (lib/accountNudge.ts): a real, visible card offering to
// create an account, once a local-only user's profile is old enough to hold
// real data. Same mocking pattern as e2e/family-surfaces.spec.ts uses for
// /api/v1/auth-status — matched by pathname, not the build-chunk glob.

const NUDGE_HEADING = "Guardá lo que ya registraste";

async function mockAuthStatus(
  context: BrowserContext,
  status: { providers?: string[]; credentialsAvailable?: boolean; signedIn: boolean },
) {
  await context.route(
    (url) => url.pathname === "/api/v1/auth-status",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          providers: status.providers ?? [],
          credentialsAvailable: status.credentialsAvailable ?? false,
          signedIn: status.signedIn,
        }),
      }),
  );
}

/** Backdates the local profile row's `createdAt`, like tool-depth.spec.ts ages contractions. */
async function ageProfile(page: Page, daysAgo: number) {
  await page.evaluate(async (ms) => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    const tx = database.transaction("profile", "readwrite");
    const store = tx.objectStore("profile");
    const rows: { id: number }[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    for (const row of rows) {
      store.put({ ...row, createdAt: Date.now() - ms });
    }
    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
  }, daysAgo * 86400000);
}

test("account nudge: absent for a signed-in user", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Onboards local-only first — mocking `signedIn: true` up front would change
  // the account step's own UI (no "Seguir sin cuenta" button to click), which
  // isn't what this test is about. The mock flips to signed-in only after.
  await completeOnboarding(page);
  await ageProfile(page, 30);
  await mockAuthStatus(context, { providers: ["google"], signedIn: true });
  await page.reload();

  await expect(page.getByRole("heading", { name: NUDGE_HEADING })).toHaveCount(0);
});

test("account nudge: absent when auth isn't configured in this deployment", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await mockAuthStatus(context, { providers: [], credentialsAvailable: false, signedIn: false });
  const page = await context.newPage();
  await completeOnboarding(page);
  await ageProfile(page, 30);
  await page.reload();

  await expect(page.getByRole("heading", { name: NUDGE_HEADING })).toHaveCount(0);
});

test("account nudge: absent for a brand-new profile", async ({ browser }) => {
  const context = await browser.newContext();
  await mockAuthStatus(context, { providers: ["google"], signedIn: false });
  const page = await context.newPage();
  await completeOnboarding(page);
  // No aging: the profile is minutes old, same as right after onboarding.
  await page.reload();

  await expect(page.getByRole("heading", { name: NUDGE_HEADING })).toHaveCount(0);
});

test("account nudge: appears for a local-only user with an old-enough profile", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await mockAuthStatus(context, { providers: ["google"], signedIn: false });
  const page = await context.newPage();
  await completeOnboarding(page);
  await ageProfile(page, 10); // past the 7-day threshold
  await page.reload();

  const nudge = page.getByRole("heading", { name: NUDGE_HEADING });
  await expect(nudge).toBeVisible();

  // Dismissing it hides it for this session without deleting the mechanism —
  // it is a snooze (lib/accountNudge.ts), not a permanent "gone forever".
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect(nudge).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: NUDGE_HEADING })).toHaveCount(0);
});
