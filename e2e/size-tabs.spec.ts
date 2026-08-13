import { test, expect } from "@playwright/test";

// BUILD-PLAN C3 (feature map #12): the same week answered three ways. A 70-day
// LMP puts the user in week 11 — foot ≈0,7 cm, hand ≈0,6 cm.

async function onboardAt(page: import("@playwright/test").Page, daysAgo: number) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  const lmp = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

test("switching tabs answers the same week three ways", async ({ page }) => {
  await onboardAt(page, 70);

  const panel = page.getByRole("tabpanel");
  await expect(page.getByRole("tab", { name: "Tamaño" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(panel).toContainText("frutilla");

  await page.getByRole("tab", { name: "Pie" }).click();
  await expect(panel).toContainText("0,7 cm");
  await expect(panel).toContainText("semilla de sandía");

  await page.getByRole("tab", { name: "Mano" }).click();
  await expect(panel).toContainText("0,6 cm");
});

test("a week with no foot to measure shows no foot tab", async ({ page }) => {
  // Week 5: there is genuinely nothing to measure, and the card drops to the
  // single "tamaño" tab rather than showing an empty panel.
  await onboardAt(page, 30);

  await expect(page.getByText("Qué tan grande está")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Pie" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Mano" })).toHaveCount(0);
});
