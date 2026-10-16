import { expect, test } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

for (const width of [320, 1280]) {
  test(`home stays readable and navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await completeOnboarding(page, { daysAgo: 140 });

    const main = page.getByRole("main");
    const hero = page.getByRole("region", { name: "El desarrollo de tu bebé", exact: true });
    const appointment = page.getByRole("region", { name: "Próximo control", exact: true });
    const daily = page.getByRole("region", { name: "Un momento para vos", exact: true });
    const reading = page.getByRole("region", { name: "Para conocer tu semana", exact: true });
    const tools = page.getByRole("region", { name: "Tus herramientas", exact: true });

    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByText("Fecha probable", { exact: true })).toBeVisible();
    await expect(hero.getByRole("button", { name: "Cambiar el fondo" })).toBeVisible();
    await expect(hero.getByRole("group", { name: "Cómo ver el tamaño de tu bebé" })).toBeVisible();

    // The practical next action and daily habit lead the longer reading/tool lists.
    for (const region of [hero, appointment, daily, reading, tools]) {
      await expect(region).toBeVisible();
    }
    const regions = await Promise.all([hero, appointment, daily, reading, tools].map((item) => item.boundingBox()));
    for (let index = 1; index < regions.length; index += 1) {
      expect(regions[index]!.y).toBeGreaterThan(regions[index - 1]!.y);
    }

    const shell = await main.boundingBox();
    expect(shell!.width).toBeLessThanOrEqual(768);
    if (width > 768) expect(shell!.width).toBeGreaterThan(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    const navigation = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(navigation.getByRole("link", { name: "Hoy", exact: true })).toHaveAttribute("aria-current", "page");
    for (const link of await navigation.getByRole("link").all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("link", { name: "SOS", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajustes", exact: true })).toBeVisible();

    // Keyboard users can bypass the persistent header without losing page context.
    const skip = page.getByRole("link", { name: "Ir al contenido", exact: true });
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(main).toBeFocused();
    const headerBounds = await page.locator("header.sticky").boundingBox();
    const headingBounds = await hero.getByRole("heading", { level: 1 }).boundingBox();
    expect(headingBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
  });
}
