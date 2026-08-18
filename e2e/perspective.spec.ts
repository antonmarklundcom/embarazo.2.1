import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C4 (feature map #13): the same week with three entrances, opening
// on the role the user chose in onboarding (B1).

const onboard = (page: import("@playwright/test").Page, role: string) =>
  completeOnboarding(page, { role, daysAgo: 140 });

test("a mamá opens on 'para vos' and can read the other two", async ({ page }) => {
  await onboard(page, "Mamá");

  const panel = page.getByRole("tabpanel", { name: "Para vos" });
  await expect(panel).toBeVisible();

  // Nothing is hidden by role: showing the partner tab to somebody is half of
  // what this block is for.
  await page.getByRole("tab", { name: "Para tu pareja" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para tu pareja" })).toBeVisible();

  await page.getByRole("tab", { name: "Para la familia" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para la familia" })).toBeVisible();
});

test("a papá does not have to tap past the 'para vos' tab", async ({ page }) => {
  await onboard(page, "Papá");

  await expect(page.getByRole("tab", { name: "Para tu pareja" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
