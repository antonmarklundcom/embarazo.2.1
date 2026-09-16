import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// U11 — the home screen now mounts U3's Recomendados rail directly (U3 built
// it self-gating but unmounted anywhere). Same mocking pattern
// e2e/recomendados.spec.ts already uses for /api/v1/flags, since CI has no
// database to serve a real flag row from.

async function mockRecomendadosFlag(page: import("@playwright/test").Page, on: boolean) {
  await page.route("**/api/v1/flags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recomendados: on }),
    }),
  );
}

test("flag off: no Recomendados rail on the home screen", async ({ page }) => {
  await mockRecomendadosFlag(page, false);
  await completeOnboarding(page, { daysAgo: 70 });

  await expect(page.locator("#recomendados")).toHaveCount(0);
});

test("flag on: the Recomendados rail renders on the home screen", async ({
  page,
}) => {
  await mockRecomendadosFlag(page, true);
  await completeOnboarding(page, { daysAgo: 70 });

  await expect(page.locator("#recomendados")).toBeVisible();
  // Stage 0 (shown at every trimester), same fixture e2e/recomendados.spec.ts
  // already asserts against.
  await expect(
    page.getByRole("heading", { name: "Números de emergencia, siempre a mano" }),
  ).toBeVisible();
});
