import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";

test("desktop offers a local QR, manual platform choice and no external QR request", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");
  const card = page.getByRole("region", { name: "Instalar Mi Bebé" });
  await expect(card.getByRole("button", { name: "Computadora", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("img", { name: /Código QR/ })).toBeVisible();
  await card.getByRole("button", { name: "iPhone / iPad" }).click();
  await expect(card.getByText(/Tocá Compartir/)).toBeVisible();
  await expect(card.getByRole("img")).toHaveCount(0);
  await card.getByRole("button", { name: "Android", exact: true }).click();
  await expect(card.getByText(/Abrí el menú/)).toBeVisible();
});

test.describe("iPhone in a browser", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1" });
  test("prioritizes Safari instructions without pretending to open a native install prompt", async ({ page }) => {
    await completeOnboarding(page);
    await page.goto("/ajustes");
    const card = page.getByRole("region", { name: "Instalar Mi Bebé" });
    await expect(card.getByRole("button", { name: "iPhone / iPad" })).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByText(/Abrir como app web/)).toBeVisible();
    await expect(card.getByRole("img")).toHaveCount(0);
  });
});

test("an installed standalone app does not advertise installing again", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = query => query === "(display-mode: standalone)"
      ? { ...original(query), matches: true } as MediaQueryList : original(query);
  });
  await completeOnboarding(page);
  await page.goto("/ajustes");
  await expect(page.getByRole("region", { name: "Instalar Mi Bebé" })).toHaveCount(0);
});
