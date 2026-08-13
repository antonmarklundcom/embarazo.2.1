import { test, expect } from "@playwright/test";

// BUILD-PLAN C6 (feature map #15, #17): the home rail shows the guías that are
// about this week, with a read time, and the read time follows through to the
// article itself.

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

test("week 34 is offered the bolso guía, and it opens", async ({ page }) => {
  await onboardAt(page, 238); // ~34 weeks

  const rail = page.getByRole("region", { name: "Para leer esta semana" });
  await expect(rail).toBeVisible();
  await expect(rail).toContainText("min de lectura");

  const bolso = rail.getByRole("link", { name: /bolso/i });
  await expect(bolso).toBeVisible();
  await bolso.click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("sanatorio");
  await expect(page.getByText(/min de lectura/)).toBeVisible();
});

test("an early week is not offered the bolso guía", async ({ page }) => {
  await onboardAt(page, 56); // ~8 weeks

  const rail = page.getByRole("region", { name: "Para leer esta semana" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("link", { name: /bolso/i })).toHaveCount(0);
  await expect(rail.getByRole("link", { name: /control prenatal/i })).toBeVisible();
});
