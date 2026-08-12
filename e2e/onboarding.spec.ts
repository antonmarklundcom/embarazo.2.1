import { test, expect } from "@playwright/test";

// P1.7 (BUILD-PLAN.md): complete onboarding, both modes and both date-entry
// paths for "embarazada". Each test gets a fresh browser context (isolated
// IndexedDB/localStorage), so no cleanup is needed between runs.

test("embarazada mode via last menstrual period date", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bienvenida a Mi Bebé" })).toBeVisible();

  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  const lmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("embarazada mode via due date", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  await page
    .getByText("No sé mi última regla — usar fecha probable de parto")
    .click();
  const due = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10);
  await page.locator("#due").fill(due);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("planeando mode skips the pregnancy date step", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy planeando / buscando" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  // No LMP/due-date step for this mode — straight to department.
  await expect(page.locator("#dep")).toBeVisible();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(
    page.getByRole("heading", { name: "Estás planeando tu embarazo" }),
  ).toBeVisible();
});
