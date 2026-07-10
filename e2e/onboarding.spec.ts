import { test, expect } from "@playwright/test";

// Each test gets a fresh browser context, so IndexedDB starts empty and the
// first-run onboarding gate always renders.

test("onboarding — embarazada with last-period date reaches the dashboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();

  // ~20 weeks ago, well within the allowed range.
  const lmp = new Date(Date.now() - 20 * 7 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption("capital");
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByRole("heading", { name: /Semana \d+/ })).toBeVisible();
});

test("onboarding — embarazada with due date reaches the dashboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();

  await page
    .getByText("No sé mi última regla — usar fecha probable de parto")
    .click();
  // A due date ~20 weeks out implies a mid-pregnancy week now.
  const due = new Date(Date.now() + 20 * 7 * 86400000).toISOString().slice(0, 10);
  await page.locator("#due").fill(due);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption("central");
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByRole("heading", { name: /Semana \d+/ })).toBeVisible();
});

test("onboarding — planeando reaches its own dashboard (no week)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Estoy planeando/ }).click();

  await page.locator("#dep").selectOption("capital");
  await page.getByRole("button", { name: "Empezar" }).click();

  // Planeando home should not show a gestational-week heading.
  await expect(page.getByRole("heading", { name: /Semana \d+/ })).toHaveCount(0);
});
