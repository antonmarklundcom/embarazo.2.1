import { test, expect } from "@playwright/test";

import { gotoPrecached, waitForPrecache } from "./helpers/offline";
import { completeOnboarding } from "./helpers/onboarding";

// P1.7 (BUILD-PLAN.md): offline navigation to a precached week page. All 42
// /semana/[n] pages are statically generated and land in the Serwist
// precache manifest (app/sw.ts), independent of onboarding/profile state.
test("navigates to a precached week page while offline", async ({ page, context }) => {
  // Settle normal onboarding before cutting the network; a pending home
  // onboarding navigation must not race this public weekly-page check.
  // Account-specific offline ownership is covered by account-entry.spec.ts.
  await completeOnboarding(page, { daysAgo: 98 });
  // Wait for the worker to control this page AND for the entry to exist
  // before going offline — `serviceWorker.ready` alone proves neither, and
  // both are what this navigation depends on (see helpers/offline.ts).
  // Wait for every format/width the browser may select, not only the document.
  await waitForPrecache(page, [
    "/semana/15",
    "/assets/img/bebe-realista-semana-15-640.avif",
    "/assets/img/bebe-realista-semana-15-1280.avif",
    "/assets/img/bebe-realista-semana-15-640.webp",
    "/assets/img/bebe-realista-semana-15-1280.webp",
  ]);

  await context.setOffline(true);
  await gotoPrecached(page, "/semana/15");

  await expect(page.getByRole("heading", { name: "Para hacer esta semana" })).toBeVisible();
  const baby = page.locator('figure img[data-canonical-src^="/assets/semanas/bebe-15.webp"]');
  await expect(baby).toBeVisible();
  await expect.poll(() => baby.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => baby.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(
    /\/assets\/img\/bebe-realista-semana-15-(?:640|1280)\.(?:avif|webp)(?:\?.*)?$/,
  );
});
