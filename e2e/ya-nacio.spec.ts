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

  const done = page.getByRole("region", { name: "Tu bebé ya nació" });
  await expect(done).toContainText("Hoy tiene 2 días");
  await expect(card).toHaveCount(0);

  // It survives a reload: it is on the pregnancy record, not in component state.
  await page.reload();
  await expect(page.getByRole("region", { name: "Tu bebé ya nació" })).toBeVisible();

  await page.goto("/ajustes");
  const settings = page.getByRole("region", { name: "Fecha de nacimiento" });
  await expect(settings.getByLabel("Fecha de nacimiento")).toHaveValue(localInput(2));
  await settings.getByRole("button", { name: "Deshacer «Ya nació»" }).click();
  await expect(settings).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("region", { name: "¿Ya nació tu bebé?" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu bebé ya nació" })).toHaveCount(0);
});
