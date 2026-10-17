import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Privacy — leaving an account must end THIS phone's push subscription.
//
// Without it the server keeps poking the endpoint at the previous account's
// reminder times. The DELETE has to be sent while the session cookie still
// exists, so it must come BEFORE the sign-out request, and before local data is
// wiped.
//
// Scope: CI/local preview runs with no auth configured, so the account card's
// "Cerrar sesión" (a server action behind a real session) cannot be reached
// here; that path is verified against a configured deployment. What is
// reachable, and what this covers, is Ajustes → "Borrar datos de este teléfono"
// (lib/sync/deviceWipe.ts), which shares the same `endPushForSignOut`. Auth.js's
// own endpoints are stubbed in the page so the order of requests is observable.
//

const ENDPOINT = "https://fcm.googleapis.com/fixture-only";

async function subscribedDevice(page: Page, events: string[], deleteHangs: boolean): Promise<void> {
  await page.exposeFunction("recordPushEvent", (event: string) => { events.push(event); });
  await page.addInitScript(({ endpoint, deleteHangs }) => {
    const record = (event: string) => (window as unknown as { recordPushEvent: (e: string) => void }).recordPushEvent(event);
    const subscription = {
      endpoint,
      toJSON: () => ({ keys: { p256dh: "fixture", auth: "fixture" } }),
      unsubscribe: async () => { record("unsubscribe"); return true; },
    };
    Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    PushManager.prototype.getSubscription = async () => subscription as unknown as PushSubscription;
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      // Auth.js sends `method: "post"` in lower case.
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (url.pathname === "/api/v1/push") {
        if (method === "GET") {
          return Promise.resolve(new Response(JSON.stringify({ publicKey: "BNtestkey" }), { status: 200 }));
        }
        if (method === "DELETE") {
          record(`push-delete:${JSON.parse(String(init?.body)).endpoint}`);
          return deleteHangs ? new Promise<Response>(() => {}) : Promise.resolve(new Response("{}", { status: 200 }));
        }
      }
      // Auth.js (next-auth/react) signOut({ redirect: false }).
      if (url.pathname === "/api/auth/csrf") {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: "fixture" }), { status: 200 }));
      }
      if (url.pathname === "/api/auth/signout" && method === "POST") {
        record("signout");
        return Promise.resolve(new Response(JSON.stringify({ url: location.origin }), { status: 200 }));
      }
      if (url.pathname === "/api/auth/session") {
        return Promise.resolve(new Response("null", { status: 200 }));
      }
      return original(input, init);
    };
  }, { endpoint: ENDPOINT, deleteHangs });
}

async function wipeThisPhone(page: Page): Promise<void> {
  await page.goto("/ajustes");
  await page.getByRole("button", { name: "Borrar datos de este teléfono" }).click();
  await page.getByRole("button", { name: "Sí, borrar este teléfono" }).click();
}

test("the push subscription is deleted on the server before the session is ended", async ({ page }) => {
  const events: string[] = [];
  await subscribedDevice(page, events, false);
  await completeOnboarding(page);
  await wipeThisPhone(page);

  // Reading the subscription waits up to 6 s for the service worker (lib/push/client.ts).
  await expect.poll(() => events, { timeout: 20_000 }).toContain("signout");
  expect(events.indexOf(`push-delete:${ENDPOINT}`)).toBeGreaterThanOrEqual(0);
  expect(events.indexOf(`push-delete:${ENDPOINT}`)).toBeLessThan(events.indexOf("signout"));
  expect(events.indexOf("unsubscribe")).toBeLessThan(events.indexOf("signout"));
});

test("a hanging push request cannot hold the wipe: sign-out still happens", async ({ page }) => {
  const events: string[] = [];
  await subscribedDevice(page, events, true);
  await completeOnboarding(page);
  await wipeThisPhone(page);

  // endPushForSignOut gives up after 4 s (plus up to 6 s for a slow worker).
  await expect.poll(() => events, { timeout: 25_000 }).toContain("signout");
  expect(events[0]).toBe(`push-delete:${ENDPOINT}`);
});
