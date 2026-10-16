import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

test("nutrition art follows its guidance and never replaces the baby's week image", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/semana/10");

  const nutritionTip = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Para hacer esta semana", exact: true }),
  });
  await expect(nutritionTip).toContainText("La mandarina y la naranja aportan vitamina C");
  const image = nutritionTip.locator('picture[data-editorial-image="vitamin-c"] img');
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  const baby10 = page.locator('figure img[data-canonical-src^="/assets/semanas/bebe-10.webp"]');
  await expect(baby10).toBeVisible();
  await expect.poll(() => baby10.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);

  await page.goto("/semana/11");
  const nextTip = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Para hacer esta semana", exact: true }),
  });
  await expect(nextTip).toContainText("ecografía");
  await expect(nextTip.locator("picture")).toHaveCount(0);
  const baby11 = page.locator('figure img[data-canonical-src^="/assets/semanas/bebe-11.webp"]');
  await expect(baby11).toBeVisible();
  await expect.poll(() => baby11.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
});
