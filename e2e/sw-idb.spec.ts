import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// F21 — the service worker reads IndexedDB to word a push notification. That
// connection used to stay open for as long as the worker lived, and an open
// connection blocks deleteDatabase: in Chromium, "Borrar todos mis datos" after
// a push waited ~27 s, until the idle worker was killed. The push is delivered
// to the REAL built worker through the DevTools protocol.

async function pushToWorker(context: BrowserContext, page: Page): Promise<void> {
  const cdp = await context.newCDPSession(page);
  const registrations: { registrationId: string }[] = [];
  cdp.on("ServiceWorker.workerRegistrationUpdated", (event: { registrations: { registrationId: string }[] }) => {
    registrations.push(...event.registrations);
  });
  await cdp.send("ServiceWorker.enable");
  await expect.poll(() => registrations.length).toBeGreaterThan(0);
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin: new URL(page.url()).origin,
    registrationId: registrations[0]!.registrationId,
    data: "",
  });
}

test("deleting the database right after a push is not held up by the worker", async ({ context, page, baseURL }) => {
  await context.grantPermissions(["notifications"], { origin: baseURL });
  await completeOnboarding(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60_000 });

  await pushToWorker(context, page);
  await page.waitForTimeout(1500); // the worker has read IndexedDB to word the notification

  const ms = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const t0 = performance.now();
        const request = indexedDB.deleteDatabase("mibebe");
        request.onsuccess = () => resolve(performance.now() - t0);
        setTimeout(() => resolve(Number.POSITIVE_INFINITY), 10_000);
      }),
  );
  expect(ms).toBeLessThan(2_000);
});
