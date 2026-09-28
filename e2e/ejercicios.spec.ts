import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN D6 — "Ejercicios" was gated on real step images (the same rule
// as the video gallery). On 2026-09-28 all 24 images landed
// (`public/assets/ejercicios/README.md`, `scripts/place-exercise-art.mjs`), so
// all 12 exercises are published and the tile is a link. The gate itself is
// still proven at the unit level (`lib/seed/ejercicios.test.ts`).

test("the tile opens the list of all 12 exercises", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await page.goto("/herramientas");

  const tile = page.getByRole("link", { name: /^Ejercicios/ });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page).toHaveURL(/\/herramientas\/ejercicios$/);
  await expect(page.getByRole("link", { name: /Caminar/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Piso pélvico/ }).first()).toBeVisible();
});

test("an exercise shows its illustrated steps, and every image loads", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await page.goto("/herramientas/ejercicios/caminar");

  const images = page.locator('img[src*="ejercicios%2Fcaminar-"]');
  await expect(images).toHaveCount(2);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
});

test("an unknown exercise id 404s", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  const response = await page.goto("/herramientas/ejercicios/no-existe");
  expect(response?.status()).toBe(404);
});
