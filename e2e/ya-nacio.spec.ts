import { expect, test } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Growth plan item 9 ("Ya nació", G1): the birth date on the pregnancy record.

const localInput = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

test("before week 37 Hoy does not ask", async ({ page }) => {
  // 245 days: 35+0, week 36.
  await completeOnboarding(page, { daysAgo: 245 });
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByRole("region", { name: "¿Ya nació tu bebé?" })).toHaveCount(0);
});

test("from week 37 she records the birth date, and can undo it from Ajustes", async ({ page }) => {
  // 262 days: 37+3, week 38.
  await completeOnboarding(page, { daysAgo: 262 });

  const card = page.getByRole("region", { name: "¿Ya nació tu bebé?" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Sí, ya nació" }).click();

  // Never in the future.
  const date = card.getByLabel("¿Qué día nació?");
  await expect(date).toHaveAttribute("max", localInput(0));
  await date.fill(localInput(2));
  await card.getByRole("button", { name: "Guardar la fecha" }).click();

  // G2: Hoy is now about the baby.
  await expect(page.getByRole("heading", { name: "Tu bebé tiene 2 días" })).toBeVisible();
  await expect(card).toHaveCount(0);

  // It survives a reload: it is on the pregnancy record, not in component state.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tu bebé tiene 2 días" })).toBeVisible();

  await page.goto("/ajustes");
  const settings = page.getByRole("region", { name: "Fecha de nacimiento" });
  await expect(settings.getByLabel("Fecha de nacimiento")).toHaveValue(localInput(2));
  await settings.getByRole("button", { name: "Deshacer «Ya nació»" }).click();
  await expect(settings).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("region", { name: "¿Ya nació tu bebé?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Tu bebé tiene/ })).toHaveCount(0);
});

test("the baby home: age, the four cards, alarm signs to /emergencia, and no missing picture", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 262 });
  const card = page.getByRole("region", { name: "¿Ya nació tu bebé?" });
  await card.getByRole("button", { name: "Sí, ya nació" }).click();
  await card.getByLabel("¿Qué día nació?").fill(localInput(10));
  await card.getByRole("button", { name: "Guardar la fecha" }).click();

  await expect(page.getByRole("heading", { name: "Tu bebé tiene 1 semana" })).toBeVisible();
  for (const name of ["Vacunas", "Trámites", "Alimentación y sueño", "Señales de alarma en tu bebé"]) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }
  // The vaccine card lists no calendar until a sourced one exists.
  await expect(page.getByRole("region", { name: "Vacunas" })).toContainText("libreta de vacunación");
  await expect(page.getByRole("region", { name: "Trámites" }).getByRole("link")).toHaveAttribute(
    "href",
    "/guias/despues-del-nacimiento-tramites",
  );
  // The age-band picture (0–2 months) loads; the drawn face is only the fallback.
  const hero = page.getByRole("region", { name: "Tu bebé" });
  const picture = hero.getByRole("img", { name: /recién nacido/ });
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  // The pregnancy hero is gone, the mood check-in stays.
  await expect(page.getByText("Tip de hoy")).toHaveCount(0);

  const alarm = page.getByRole("region", { name: "Señales de alarma en tu bebé" }).getByRole("link");
  expect(await alarm.count()).toBeGreaterThan(4);
  await alarm.first().click();
  await expect(page).toHaveURL(/\/emergencia$/);
});
