import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { serveIdentity } from "./helpers/identity";
import { completeOnboarding } from "./helpers/onboarding";

// Signed-out visitors send no `/api/v1/sync` request, not even from the photo
// and sharing code.
//
// Automatic sync already asks `/api/v1/auth-status` first (2026-10-17, #2).
// Photos (`syncPhotos`, `deleteRemotePhoto`), the companion snapshot and the
// push schedules go through `ensureAccountLink`, which opened with the sync
// identity probe: a 401 for every signed-out visitor. It now asks auth-status
// first too. These specs watch the page's own requests.
//
// The local preview these specs run in does not require an account
// (AUTH_REQUIRE_ACCOUNT=false in playwright.config.ts), so private pages open
// for a signed-out visitor, which is exactly the case under test.

async function serveSignedOut(context: BrowserContext) {
  await context.route("**/api/v1/auth-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        providers: ["google"],
        credentialsAvailable: false,
        signedIn: false,
        accountRequired: false,
        accountId: null,
      }),
    }),
  );
}

/** Photo backup switched on in the local profile, as a phone that opted in. */
async function turnOnLocalPhotoBackup(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("mibebe");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("profile", "readwrite");
      const store = transaction.objectStore("profile");
      const all = store.getAll();
      all.onsuccess = () => {
        for (const row of all.result) store.put({ ...row, photoBackup: true });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
}

/** Every request the page makes to the sync route, from now on. */
function watchSync(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/sync") seen.push(request.method());
  });
  return seen;
}

// 1x1 PNG, so the photo diary's own downscale step has a real image to read.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("a signed-out visit to the photo diary and Familia sends no /api/v1/sync request", async ({ page, context }) => {
  await completeOnboarding(page);
  await serveSignedOut(context);
  await turnOnLocalPhotoBackup(page);
  const sync = watchSync(page);

  await page.goto("/herramientas/fotos");
  await expect(page.locator("main h1")).toBeVisible();
  // The photo coordinator starts two seconds after the app opens
  // (startPhotoSync). With backup on it used to probe the account right then.
  await page.waitForTimeout(3_000);

  // Adding a photo uploads it "now" when backup is on: the other photo path.
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "ecografia.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.locator("main img").first()).toBeVisible();
  await page.waitForTimeout(500);

  await page.goto("/familia");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForTimeout(1_500);

  expect(sync, "no account probe while signed out").toEqual([]);
});

test("signed in, the same photo path still asks which account the session is", async ({ page, context }) => {
  await completeOnboarding(page);
  await serveIdentity(context, "photo-owner");
  await turnOnLocalPhotoBackup(page);
  const sync = watchSync(page);

  await page.goto("/herramientas/fotos");
  await expect(page.locator("main h1")).toBeVisible();

  // Proves the watcher above can see the probe: a signed-in session keeps it.
  await expect.poll(() => sync.length, { timeout: 10_000 }).toBeGreaterThan(0);
});
