import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Owner acceptance — the real service worker's half of "Probar avisos".
//
// A push is delivered through DevTools (not a push service), so this proves
// the worker recognises the settings screen's marker, words the notice as the
// test, consumes the marker, and does not relabel the next ordinary poke.
//
// Full Chromium, not the default headless shell: the shell reports
// Notification.permission "denied" even after a grant, so showNotification is
// refused there. The channel has to be set for the whole file.
test.use({ channel: "chromium" });

const marker = (page: Page) =>
  page.evaluate(async () => {
    const cache = await caches.open("mibebe-push-test");
    const hit = await cache.match("/__mibebe/push-test");
    return hit ? Number(await hit.text()) : null;
  });

test("the service worker words a marked push as the test, once", async ({ page, context, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "DevTools push delivery is Chromium-only");
  await context.grantPermissions(["notifications"], { origin: new URL(baseURL!).origin });
  await completeOnboarding(page);
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cdp = await context.newCDPSession(page);
  const registrationId = await new Promise<string>((resolve) => {
    cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
      const live = registrations.find((r: { isDeleted: boolean }) => !r.isDeleted);
      if (live) resolve(live.registrationId);
    });
    void cdp.send("ServiceWorker.enable");
  });
  const origin = new URL(page.url()).origin;
  const titles = async () =>
    page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => n.title));

  await page.evaluate(async () => {
    const cache = await caches.open("mibebe-push-test");
    await cache.put("/__mibebe/push-test", new Response(String(Date.now())));
  });
  await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data: "" });
  await expect.poll(titles).toContain("Mi Bebé: aviso de prueba");
  expect(await marker(page)).toBeNull();

  // The next ordinary poke is not relabelled.
  await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data: "" });
  await expect.poll(async () => (await titles()).some((t) => !t.includes("prueba"))).toBe(true);
});
