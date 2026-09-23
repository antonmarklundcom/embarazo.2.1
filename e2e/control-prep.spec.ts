import { expect, test } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Preparar mi control — questions for her week plus her own, printed on the
// summary she shows at the consultation (lib/controlPrep.ts).

test("she picks questions for her week, adds her own, and both reach the printed sheet", async ({
  page,
}) => {
  // 150 days: 21+3, week 22 — the morfológica window.
  await completeOnboarding(page, { daysAgo: 150 });
  await page.goto("/herramientas/resumen");

  const panel = page.getByRole("region", { name: "Preparar mi control" });
  await expect(panel).toBeVisible();
  await panel.getByLabel(/ecografía morfológica/).check();
  await panel.getByLabel("Tus preguntas").fill("¿Puedo viajar en ómnibus a Encarnación?");
  await panel.getByRole("button", { name: "Agregar" }).click();

  const sheet = page.locator("article");
  await expect(sheet.getByRole("heading", { name: "Preguntas para esta consulta" })).toBeVisible();
  await expect(sheet).toContainText("ecografía morfológica");
  await expect(sheet).toContainText("¿Puedo viajar en ómnibus a Encarnación?");
  await expect(sheet.getByRole("heading", { name: "Últimas 4 semanas" })).toBeVisible();

  // Kept on this device across a reload.
  await page.reload();
  await expect(page.locator("article")).toContainText("¿Puedo viajar en ómnibus a Encarnación?");
  await expect(
    page.getByRole("region", { name: "Preparar mi control" }).getByLabel(/ecografía morfológica/),
  ).toBeChecked();
});
