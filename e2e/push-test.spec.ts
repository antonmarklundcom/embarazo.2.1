import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Owner acceptance — "Probar avisos" in Ajustes.
//
// What a browser fixture can prove: the test controls appear only when this
// phone is subscribed, the request names this device and this account, each
// outcome is explained, the tap destination confirms itself, and the real
// service worker words a marked push as the test (delivered through DevTools,
// not a push service). What it cannot prove is an Android phone receiving it
// with the app closed — that is the owner's device check this feature exists for.

const ENDPOINT = "https://fcm.googleapis.com/fixture-only";

async function subscribedDevice(page: Page, testStatus: number, signedIn = true): Promise<void> {
  await page.addInitScript(({ endpoint, testStatus, signedIn }) => {
    const subscription = {
      endpoint,
      toJSON: () => ({ keys: { p256dh: "fixture", auth: "fixture" } }),
      unsubscribe: async () => true,
    };
    Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    PushManager.prototype.getSubscription = async () => subscription as unknown as PushSubscription;
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname === "/api/v1/push" && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(new Response(JSON.stringify({ publicKey: "BNtestkey" }), { status: 200 }));
      }
      if (url.pathname === "/api/v1/sync" && url.searchParams.has("since")) {
        return Promise.resolve(signedIn
          ? new Response(JSON.stringify({ accountId: "fixture-account", records: [], cursor: 0 }), { status: 200 })
          : new Response("{}", { status: 401 }));
      }
      if (url.pathname === "/api/v1/push/test") {
        sessionStorage.setItem("testRequest", JSON.stringify({
          body: JSON.parse(String(init?.body)),
          account: new Headers(init?.headers).get("X-Mibebe-Account"),
        }));
        return Promise.resolve(new Response("{}", { status: testStatus }));
      }
      return original(input, init);
    };
  }, { endpoint: ENDPOINT, testStatus, signedIn });
}

const marker = (page: Page) =>
  page.evaluate(async () => {
    const cache = await caches.open("mibebe-push-test");
    const hit = await cache.match("/__mibebe/push-test");
    return hit ? Number(await hit.text()) : null;
  });

test("a subscribed phone can ask for a test after closing the app", async ({ page }) => {
  await subscribedDevice(page, 202);
  await completeOnboarding(page);
  await page.goto("/ajustes");

  await expect(page.getByRole("heading", { name: "Probar los avisos" })).toBeVisible();
  await page.getByRole("button", { name: "Probar con la app cerrada" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cerrá Mi Bebé ahora" })).toBeVisible();

  const request = JSON.parse((await page.evaluate(() => sessionStorage.getItem("testRequest")))!);
  expect(request).toEqual({ body: { endpoint: ENDPOINT, delayMs: 20_000 }, account: "fixture-account" });
  // The worker will word the next push as the test.
  expect(await marker(page)).toBeGreaterThan(Date.now() - 60_000);
});

test("each refusal is explained and leaves no marker behind", async ({ page }) => {
  await subscribedDevice(page, 404);
  await completeOnboarding(page);
  await page.goto("/ajustes");

  await page.getByRole("button", { name: "Enviar ahora" }).click();
  await expect(page.getByRole("status").filter({ hasText: "no tiene los avisos guardados" })).toBeVisible();
  expect(await marker(page)).toBeNull();
});

test("a signed-out phone is told to sign in instead of sending", async ({ page }) => {
  await subscribedDevice(page, 200, false);
  await completeOnboarding(page);
  await page.goto("/ajustes");

  await page.getByRole("button", { name: "Enviar ahora" }).click();
  await expect(page.getByRole("status").filter({ hasText: "entrar con tu cuenta" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("testRequest"))).toBeNull();
});

test("tapping the test notification lands on a confirmation", async ({ page }) => {
  await subscribedDevice(page, 200);
  await completeOnboarding(page);
  await page.goto("/ajustes?avisos=prueba");
  await expect(page.getByText("¡Funciona! Llegaste acá tocando el aviso de prueba.")).toBeVisible();
});

test("the service worker words a marked push as the test, once", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "DevTools push delivery is Chromium-only");
  await context.grantPermissions(["notifications"]);
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
