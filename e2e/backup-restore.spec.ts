import { test, expect } from "@playwright/test";
import path from "node:path";
import os from "node:os";

async function completeOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  const lmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

// P1.7 (BUILD-PLAN.md): export a backup file, then restore it and confirm
// the app comes back up with the data intact.
test("export a backup and restore it", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar mis datos" }).click(),
  ]);
  await expect(page.getByText("Copia descargada")).toBeVisible();

  const savedPath = path.join(os.tmpdir(), `e2e-backup-${Date.now()}.json`);
  await download.saveAs(savedPath);

  await page.setInputFiles('input[type="file"]', savedPath);
  await expect(page.getByText("Esta acción no se puede deshacer")).toBeVisible();
  await page.getByRole("button", { name: "Sí, restaurar" }).click();

  // handleRestore does a full navigation back to "/" on success.
  await page.waitForURL("**/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
});
