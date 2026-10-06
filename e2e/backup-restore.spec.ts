import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";
import path from "node:path";
import os from "node:os";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";


// A 1x1 PNG: enough to become a real Blob, a real data URL in the file and a
// real thumbnail after restore.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function addPhoto(page: Page, route: string, name: string) {
  await page.goto(route);
  await page.setInputFiles('input[type="file"]', { name, mimeType: "image/png", buffer: PNG });
  await expect(page.locator("img").first()).toBeVisible();
}

async function exportBackupFile(page: Page): Promise<string> {
  await page.goto("/ajustes");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar mis datos" }).click(),
  ]);
  await expect(page.getByText("Copia descargada")).toBeVisible();
  const savedPath = path.join(os.tmpdir(), `e2e-backup-${Date.now()}-${Math.random()}.json`);
  await download.saveAs(savedPath);
  return savedPath;
}

async function restore(page: Page, savedPath: string) {
  await page.setInputFiles('input[type="file"][accept="application/json"]', savedPath);
  await expect(page.getByText("Esta acción no se puede deshacer")).toBeVisible();
  await page.getByRole("button", { name: "Sí, restaurar" }).click();
}

// P1.7 (BUILD-PLAN.md): export a backup file, then restore it and confirm
// the app comes back up with the data intact.
test("export a backup and restore it", async ({ page }) => {
  await completeOnboarding(page);
  const savedPath = await exportBackupFile(page);

  await restore(page, savedPath);

  // handleRestore does a full navigation back to "/" on success.
  await page.waitForURL("**/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  unlinkSync(savedPath);
});

// N1 — every backup holding a photo failed to restore from 2026-09-12 (V1
// enforced `connect-src`, which refuses `fetch("data:…")`) and blamed the
// user's file. The restore now decodes photos locally, under the same policy.
test("a backup with a diary photo and a carné photo restores under the enforced CSP", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to connect/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  await completeOnboarding(page);
  await addPhoto(page, "/herramientas/fotos", "panza.png");
  await addPhoto(page, "/herramientas/carne", "carne.png");
  const savedPath = await exportBackupFile(page);
  const file = JSON.parse(readFileSync(savedPath, "utf8"));
  expect(file.tables.photoEntries).toHaveLength(1);
  expect(file.tables.carnePhotos).toHaveLength(1);
  expect(String(file.tables.photoEntries[0].blob)).toMatch(/^data:image\/(png|jpeg);base64,/);

  await restore(page, savedPath);
  await page.waitForURL("**/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  await page.goto("/herramientas/fotos");
  await expect(page.locator("img").first()).toBeVisible();
  await page.goto("/herramientas/carne");
  await expect(page.locator("img").first()).toBeVisible();
  expect(violations).toEqual([]);
  unlinkSync(savedPath);
});

test("a file whose photo is a URL is refused and nothing on the phone changes", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");
  const bad = path.join(os.tmpdir(), `e2e-bad-backup-${Date.now()}.json`);
  writeFileSync(
    bad,
    JSON.stringify({
      app: "mibebe",
      version: 2,
      tables: { photoEntries: [{ week: 3, createdAt: 1, blob: "https://example.test/x.jpg" }] },
    }),
  );
  await restore(page, bad);
  await expect(page.getByText("Una de las fotos del archivo está dañada")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  unlinkSync(bad);
});
