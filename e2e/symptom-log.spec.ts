import { test, expect } from "@playwright/test";

async function completeOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  const lmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

// P1.7 (BUILD-PLAN.md): log a symptom entry after onboarding.
test("log a symptom entry", async ({ page }) => {
  await completeOnboarding(page);

  await page.goto("/herramientas/sintomas");
  await expect(page.getByRole("heading", { name: "¿Cómo te sentís hoy?" })).toBeVisible();

  await page.getByRole("button", { name: /Bien/ }).click();
  await page.getByRole("button", { name: "Náuseas", exact: true }).click();
  await page.locator("#note").fill("Prueba automatizada e2e");

  await page.getByRole("button", { name: /Guardar registro/ }).click();

  await expect(page.getByText(/guardado/i)).toBeVisible();
});
