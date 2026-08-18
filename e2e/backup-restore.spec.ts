import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";
import path from "node:path";
import os from "node:os";


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
