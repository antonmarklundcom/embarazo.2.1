import type { Page } from "@playwright/test";

/** Complete the embarazada onboarding flow with a mid-pregnancy LMP. */
export async function onboardEmbarazada(page: Page, department = "capital") {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  const lmp = new Date(Date.now() - 20 * 7 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption(department);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("heading", { name: /Semana \d+/ }).waitFor();
}
