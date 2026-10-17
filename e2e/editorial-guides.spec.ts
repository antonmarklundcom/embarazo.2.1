import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

test("mobile guides keep all eight articles in keyboard-accessible image shelves", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeOnboarding(page);
  await page.goto("/guias");

  await expect(page.getByRole("heading", { level: 1, name: "Consejos para vos" })).toBeVisible();
  const cards = page.locator("a[data-editorial-card]");
  await expect(cards).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Cuidá tu salud" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu día a día" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Prepará la llegada" })).toBeVisible();
  await expect(page.getByText("Lo más leído", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Estamos armando esta sección. Volvé pronto.")).toHaveCount(0);

  const shelf = page.getByRole("list", { name: "Cuidá tu salud", exact: true });
  await shelf.focus();
  await expect(shelf).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => shelf.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    const image = card.locator("img");
    await expect(image).toHaveAttribute("alt", /\S/);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(await image.evaluate((element: HTMLImageElement) => new URL(element.currentSrc).origin === window.location.origin)).toBe(true);
    await expect(card).toContainText(/min de lectura/);
    expect(await card.locator("h3").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // The card is named by what it shows (its short title and read time), no
  // longer by a hidden aria-label holding the full article title — axe's
  // label-content-name-mismatch rule, 2026-10-17.
  const prenatal = page.getByRole("link", { name: /Control prenatal en Paraguay/ }).and(page.locator('a[href="/guias/control-prenatal-ips-vs-privado"]'));
  await prenatal.click();
  await expect(page).toHaveURL(/\/guias\/control-prenatal-ips-vs-privado$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Control prenatal");
});

test("desktop guides use a grid without horizontal shelf overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeOnboarding(page);
  await page.goto("/guias");

  for (const name of ["Cuidá tu salud", "Tu día a día", "Prepará la llegada"]) {
    const shelf = page.getByRole("list", { name, exact: true });
    expect(await shelf.evaluate((element) => getComputedStyle(element).display)).toBe("grid");
    expect(await shelf.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await expect(page.locator("a[data-editorial-card]")).toHaveCount(8);
});
