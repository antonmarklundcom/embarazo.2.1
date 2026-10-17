import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C3 (feature map #12): the same week answered three ways. A 70-day
// LMP puts the user in week 11 — foot ≈0,7 cm, hand ≈0,6 cm.
//
// 2026-10-17: on Hoy the week hero already answers "tamaño" (fruit, cm and g,
// with the Frutas/Medidas choice), so the card under it adds only pie and
// mano instead of repeating the same numbers.

const onboardAt = (page: import("@playwright/test").Page, daysAgo: number) =>
  completeOnboarding(page, { daysAgo });

test("Hoy answers the week three ways without repeating the hero", async ({ page }) => {
  await onboardAt(page, 70);

  // Tamaño: in the hero.
  await expect(page.getByText(/Referencia de longitud|Referencia de peso/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Qué tan grande está" })).toHaveCount(0);

  const panel = page.getByRole("region", { name: "Su pie y su mano" }).getByRole("tabpanel");
  await expect(page.getByRole("tab", { name: "Bebé" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Pie" })).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("0,7 cm");
  await expect(panel).toContainText("semilla de sandía");

  await page.getByRole("tab", { name: "Mano" }).click();
  await expect(panel).toContainText("0,6 cm");
});

test("a week with no foot or hand to measure shows no extra size card", async ({ page }) => {
  // Week 5: nothing to measure beyond what the hero says.
  await onboardAt(page, 30);

  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByRole("region", { name: "Su pie y su mano" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Pie" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Mano" })).toHaveCount(0);
});
