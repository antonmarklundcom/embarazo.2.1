import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers";

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
