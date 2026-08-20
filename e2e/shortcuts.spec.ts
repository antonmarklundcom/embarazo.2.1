import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C8 (feature map #18, #19). The shortcuts must reach real screens
// in one tap, and — in this build, which has no business number configured —
// no WhatsApp button anywhere may point at a number nobody answers.

const onboard = (page: import("@playwright/test").Page) =>
  completeOnboarding(page, { daysAgo: 140 });

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

  // K7 (§7): the third shortcut was "Próximo control → /ajustes", which is
  // the dump-into-settings this task exists to remove — the control is now
  // edited in place by <NextAppointmentCard> on this same screen. The slot went
  // to /preguntas, the other shipped page that was reachable from almost
  // nowhere.
  await shortcuts.getByRole("link", { name: /Preguntas/ }).click();
  await expect(page).toHaveURL(/\/preguntas$/);
  await page.goBack();

  // And the control itself is here, not one navigation away.
  await expect(page.getByRole("region", { name: "Próximo control" })).toBeVisible();
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
