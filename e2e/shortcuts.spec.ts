import { test, expect } from "@playwright/test";

// BUILD-PLAN C8 (feature map #18, #19). The shortcuts must reach real screens
// in one tap, and — in this build, which has no business number configured —
// no WhatsApp button anywhere may point at a number nobody answers.

async function onboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  const lmp = new Date(Date.now() - 140 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

test("the three shortcuts reach their screens", async ({ page }) => {
  await onboard(page);

  const shortcuts = page.getByRole("region", { name: "Accesos rápidos" });
  await expect(shortcuts).toBeVisible();

  await shortcuts.getByRole("link", { name: /Emergencia/ }).click();
  await expect(page).toHaveURL(/\/emergencia$/);
  await page.goBack();

  await shortcuts.getByRole("link", { name: /Carné/ }).click();
  await expect(page).toHaveURL(/\/herramientas\/carne$/);
  await page.goBack();

  await shortcuts.getByRole("link", { name: /Próximo control/ }).click();
  await expect(page).toHaveURL(/\/ajustes$/);
});

test("no dead WhatsApp number is offered anywhere", async ({ page }) => {
  await onboard(page);

  // With NEXT_PUBLIC_BUSINESS_WHATSAPP unset there is no feedback card at all,
  // rather than one that opens a chat with nobody.
  await expect(page.getByText("¿Cómo te está yendo?")).toHaveCount(0);

  for (const path of ["/", "/directorio", "/eventos", "/herramientas/contracciones"]) {
    await page.goto(path);
    // The all-zero fallback these screens used to ship.
    await expect(page.locator('a[href*="wa.me/595000000000"]')).toHaveCount(0);
    await expect(page.locator('a[href*="wa.me/5950"]')).toHaveCount(0);
  }
});

test("timing contractions offers the emergency screen when no sanatorio is saved", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/herramientas/contracciones");

  // It used to offer "Contactar a mi sanatorio" pointing at Mi Bebé's own
  // unset number, on the screen a woman uses during labour.
  const fallback = page.getByRole("link", {
    name: "Números de emergencia y qué decir",
  });
  await expect(fallback).toBeVisible();
  await fallback.click();
  await expect(page).toHaveURL(/\/emergencia$/);
});
