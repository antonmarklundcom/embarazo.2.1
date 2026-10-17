import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Hoy's daily stories (Flo benchmark, 2026-10-17): a row of circles under the
// hero and a full-screen viewer that never advances by itself.

test("the stories open full screen, move with buttons and keys, and close back to the circle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeOnboarding(page, { role: "Mamá", daysAgo: 140 });

  const rail = page.getByRole("region", { name: "Tu semana en historias" });
  await expect(rail).toBeVisible();
  const bebe = rail.getByRole("button", { name: /^Bebé/ });
  await bebe.click();

  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("heading", { level: 2 })).toContainText(/Semana \d+: tu bebé/);
  await expect(viewer).toContainText(/1 de \d+/);
  // It covers the bottom navigation instead of sitting under it.
  const box = await viewer.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(800);

  await viewer.getByRole("button", { name: "Siguiente" }).click();
  await expect(viewer.getByRole("heading", { level: 2 })).toHaveText("Para vos");
  await page.keyboard.press("ArrowRight");
  await expect(viewer).toContainText(/3 de \d+/);
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByRole("heading", { level: 2 })).toHaveText("Para vos");

  // Nothing moves on its own.
  await page.waitForTimeout(6000);
  await expect(viewer.getByRole("heading", { level: 2 })).toHaveText("Para vos");

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(bebe).toBeFocused();
  // Seen stories say so to a screen reader.
  await expect(rail.getByRole("button", { name: "Vos (vista)" })).toBeVisible();
});

test("the last story ends with the symptom log", async ({ page }) => {
  await completeOnboarding(page, { role: "Mamá", daysAgo: 140 });
  await page.getByRole("region", { name: "Tu semana en historias" }).getByRole("button", { name: /^Síntomas/ }).click();
  const viewer = page.getByRole("dialog");
  await expect(viewer.getByRole("heading", { level: 2 })).toHaveText("¿Cómo te sentís hoy?");
  await viewer.getByRole("link", { name: "Registrar síntomas" }).click();
  await expect(page).toHaveURL(/\/herramientas\/sintomas$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});
