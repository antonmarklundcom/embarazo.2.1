import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";
import { openHomeSection } from "./helpers/homeSections";

// BUILD-PLAN C2 (feature map #11): the home screen leads with one concrete
// sentence about what is happening this week. A 70-day LMP puts the user in
// week 11, whose line is about the baby opening and closing its hands.

test("the home screen shows the line for the current week", async ({ page }) => {
  await completeOnboarding(page);
  await openHomeSection(page, "Tu semana");

  const block = page.getByRole("region", { name: "Esta semana", exact: true });
  await expect(block).toBeVisible();
  await expect(block).toContainText("Abre y cierra las manitos");

  // "Hoy corto" (owner-approved, 2026-11): the line moved from above the tip
  // into the "Tu semana" row, where it leads the week's reading: above Qué
  // esperar, not buried below it.
  const blockBox = await block.boundingBox();
  const nextBox = await page.getByRole("region", { name: "Qué esperar esta semana" }).boundingBox();
  expect(blockBox!.y).toBeLessThan(nextBox!.y);
});
