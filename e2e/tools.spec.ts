import { test, expect } from "@playwright/test";
import { onboardEmbarazada } from "./helpers";

test("symptom journal saves a mood + symptom entry", async ({ page }) => {
  await onboardEmbarazada(page);

  await page.goto("/herramientas/sintomas");
  await page.getByRole("button", { name: /Bien/ }).first().click();
  await page.getByRole("button", { name: "Náuseas" }).click();
  await page.getByRole("button", { name: /Guardar registro/ }).click();

  // The saved entry should appear in the history on the same page.
  await expect(page.getByText("Náuseas").first()).toBeVisible();
});

test("backup export triggers a JSON download", async ({ page }) => {
  await onboardEmbarazada(page);

  await page.goto("/ajustes");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar mis datos" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^nido-backup-\d{4}-\d{2}-\d{2}\.json$/);
});
