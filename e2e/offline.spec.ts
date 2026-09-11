import { test, expect } from "@playwright/test";

import { gotoPrecached, waitForPrecache } from "./helpers/offline";

// P1.7 (BUILD-PLAN.md): offline navigation to a precached week page. All 42
// /semana/[n] pages are statically generated and land in the Serwist
// precache manifest (app/sw.ts), independent of onboarding/profile state.
test("navigates to a precached week page while offline", async ({ page, context }) => {
  await page.goto("/");
  // Wait for the worker to control this page AND for the entry to exist
  // before going offline — `serviceWorker.ready` alone proves neither, and
  // both are what this navigation depends on (see helpers/offline.ts).
  await waitForPrecache(page, ["/semana/15"]);

  await context.setOffline(true);
  await gotoPrecached(page, "/semana/15");

  await expect(page.getByText("Qué pasa esta semana")).toBeVisible();
});
