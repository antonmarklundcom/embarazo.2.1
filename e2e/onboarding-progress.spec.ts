import { expect, test } from "@playwright/test";

import { localDateInput } from "./helpers/dates";

// First use — after the first question, each step says how much is left, the
// welcome heading steps back, and the account note appears only where it is
// relevant. Same steps, same answers: presentation only.

test("onboarding counts the steps left after the first question", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText(/Tu cuenta permite recuperar tus registros/)).toBeVisible();

  // Night run item 10: "Estoy embarazada" preselects mamá and lands on the
  // date, which is step 1.
  await page.getByRole("button", { name: /^Estoy embarazada/ }).click();
  const bar = page.getByRole("progressbar", { name: "Avance de la configuración" });
  await expect(bar).toHaveAttribute("aria-valuenow", "1");
  const total = Number(await bar.getAttribute("aria-valuemax"));
  await expect(page.getByText(`Paso 1 de ${total}`)).toBeVisible();
  // Not repeated under every question.
  await expect(page.getByText(/Tu cuenta permite recuperar tus registros/)).toHaveCount(0);

  await page.locator("#lmp").fill(localDateInput(-70));
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(`Paso 2 de ${total}`)).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", "2");
});

test("planeando still counts its role question as step 1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy planeando / buscando" }).click();
  const bar = page.getByRole("progressbar", { name: "Avance de la configuración" });
  await expect(bar).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: /^Mamá/ }).click();
  await expect(bar).toHaveAttribute("aria-valuenow", "2");
});

test("a papá's count leaves out the steps only the mamá answers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Estoy embarazada/ }).click();
  const mamaTotal = Number(await page.getByRole("progressbar").getAttribute("aria-valuemax"));
  await page.getByRole("button", { name: "Cambiar cómo te describís" }).click();
  await page.getByRole("button", { name: /^Papá/ }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", String(mamaTotal - 1));
});
