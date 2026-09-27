import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Growth plan item 14 — "¿Cómo te está yendo?" sends a happy answer to the
// Play listing only when NEXT_PUBLIC_PLAY_STORE_URL is set AND the app runs
// inside the Android app. CI builds with the switch unset, so what CI proves is
// the default: even with an Android-app referrer, nothing points at Play.
// (The switched-on path is covered by lib/rating/playReview.test.ts and was
// checked against a local build with the variable set.)

async function asAndroidApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "referrer", {
      get: () => "android-app://com.example.app/",
      configurable: true,
    });
  });
}

test("with the switch unset, the Android app gets no Play link", async ({ page }) => {
  await asAndroidApp(page);
  await completeOnboarding(page);
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.locator('a[href*="play.google.com"]')).toHaveCount(0);
});
