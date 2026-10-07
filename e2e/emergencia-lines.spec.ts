import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// /emergencia — the help lines below the alarm list. Línea 155 (MSPBS, mental
// health) and Línea 137 (Ministerio de la Mujer, SOS Mujer: domestic and family
// violence) are both curated in lib/seed/recomendados.json; this pins that each
// one dials its own number from the screen a woman opens when something is
// already wrong.

test("the emergency screen dials 155 and 137 directly", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 140 });
  await page.goto("/emergencia");

  await expect(page.getByRole("link", { name: /Línea 155/ })).toHaveAttribute("href", "tel:155");

  const violence = page.getByRole("region", { name: "Si alguien te hace daño" });
  await expect(violence).toBeVisible();
  await expect(violence.getByRole("link", { name: /Línea 137/ })).toHaveAttribute(
    "href",
    "tel:137",
  );
});
