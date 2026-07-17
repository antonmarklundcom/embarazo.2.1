import { test, expect } from "@playwright/test";

// P1.7 (BUILD-PLAN.md): offline navigation to a precached week page. All 42
// /semana/[n] pages are statically generated and land in the Serwist
// precache manifest (app/sw.ts), independent of onboarding/profile state.
test("navigates to a precached week page while offline", async ({ page, context }) => {
  await page.goto("/");
  // Wait for the service worker to finish installing + precaching before
  // going offline, otherwise the precache entries may not exist yet.
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.goto("/semana/15");

  await expect(page.getByText("Qué pasa esta semana")).toBeVisible();
});
