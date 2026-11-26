import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// The checklist's view by trimester: the week tips that are to-dos, grouped,
// opening on her trimester, each a link to the week it comes from.

test("the checklist opens on her trimester and each to-do links to its week", async ({ page }) => {
  // 70 days since the last period: week 11, first trimester.
  await completeOnboarding(page, { daysAgo: 70 });
  await page.goto("/herramientas/checklist");

  const section = page.locator("section", { has: page.getByRole("heading", { name: "Por trimestre" }) });
  await expect(section).toBeVisible();
  await expect(section.getByRole("button", { name: "Primero" })).toHaveAttribute("aria-pressed", "true");
  expect(await section.locator('a[href^="/semana/"]').count()).toBeGreaterThanOrEqual(5);

  await section.getByRole("button", { name: "Tercero" }).click();
  await expect(section.getByText("Tercer trimestre")).toBeVisible();
  const bag = section.locator('a[href="/semana/32"]');
  await expect(bag).toContainText("bolso del parto");
  await bag.click();
  await expect(page).toHaveURL(/\/semana\/32$/);
  await expect(page.getByText("Dejá listo el bolso del parto").first()).toBeVisible();
});
