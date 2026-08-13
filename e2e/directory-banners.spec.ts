import { test, expect } from "@playwright/test";

// BUILD-PLAN D5 (feature map #26). Every listing is gated today (Z1), so the
// case this build can actually exercise is the one most likely to embarrass
// the app: a category grid of zeros. There must be none — no "Categorías"
// heading, no "0 lugares" anywhere.

test("no banner grid when there is nothing to count", async ({ page }) => {
  await page.goto("/directorio");

  await expect(page.getByRole("region", { name: "Categorías" })).toHaveCount(0);
  await expect(page.getByText("0 lugares")).toHaveCount(0);

  // The honest empty state Z1 wrote is still what a user sees.
  await expect(
    page.getByText(/Todavía no tenemos lugares cargados/),
  ).toBeVisible();
});
