import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Growth plan item 8 — "¿Te aviso cuando empieza tu semana nueva?" closes
// onboarding. The property that matters is WHEN the browser is asked: only
// after "Sí", never on a page load and never on "Ahora no". A browser lets an
// app ask once; a prompt nobody asked for gets a permanent "no".

async function countPermissionAsks(page: Page): Promise<void> {
  // Counted in sessionStorage, not on `window`: this script re-runs on every
  // page load, and a load after onboarding would reset a window counter.
  await page.addInitScript(() => {
    if ("Notification" in window) {
      Notification.requestPermission = async () => {
        sessionStorage.setItem("asks", String(Number(sessionStorage.getItem("asks") ?? "0") + 1));
        return "denied";
      };
    }
  });
  // A configured server key, so "Sí" really reaches the permission request.
  // Stubbed at the page's own fetch rather than with page.route: once the
  // app's service worker controls the page, its requests bypass page.route.
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method === "GET" && new URL(url, location.href).pathname === "/api/v1/push") {
        return Promise.resolve(
          new Response(JSON.stringify({ publicKey: "BNtestkey" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return realFetch(input, init);
    };
  });
}

const asks = (page: Page) => page.evaluate(() => Number(sessionStorage.getItem("asks") ?? "0"));

test("'Ahora no' finishes onboarding without asking the browser", async ({ page }) => {
  await countPermissionAsks(page);
  await completeOnboarding(page); // the shared walk-through answers "Ahora no"
  expect(await asks(page)).toBe(0);
});

test("'Sí' asks for permission once, and onboarding finishes whatever the answer", async ({ page }) => {
  await countPermissionAsks(page);
  await completeOnboarding(page, { stopBeforeAvisos: true });

  const heading = page.getByRole("heading", { name: "¿Te aviso cuando empieza tu semana nueva?" });
  await expect(heading).toBeVisible();
  // Reaching the question is not asking it.
  expect(await asks(page)).toBe(0);

  await page.getByRole("button", { name: "Sí, avisame" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible({ timeout: 15_000 });
  expect(await asks(page)).toBe(1);
});

test.describe("on an iPhone without the app installed", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });

  test("'Sí' explains the install instead of asking, and she can still finish", async ({ page }) => {
    await countPermissionAsks(page);
    await completeOnboarding(page, { stopBeforeAvisos: true });
    await page.getByRole("button", { name: "Sí, avisame" }).click();
    await expect(page.getByText(/solo si instalás/)).toBeVisible();
    expect(await asks(page)).toBe(0);
    await page.getByRole("button", { name: "Entendido, empezar" }).click();
    await expect(page.getByText("Tip de hoy")).toBeVisible();
  });
});
