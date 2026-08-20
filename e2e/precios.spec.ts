import { test, expect } from "@playwright/test";

// K10 / P6 — "¿Cuánto cuesta?".
//
// It ships gated: the figures are placeholders and nothing carries a
// `reviewedBy`, so the tool renders its empty state. That is the state under
// test, because it is the state that ships.

test("the tool is reachable from herramientas", async ({ page }) => {
  await page.goto("/herramientas");
  await page.getByRole("link", { name: /¿Cuánto cuesta\?/ }).click();
  await expect(
    page.getByRole("heading", { name: "¿Cuánto cuesta?", level: 1 }),
  ).toBeVisible();
});

test("no unreviewed price ever reaches a screen", async ({ page }) => {
  await page.goto("/herramientas/precios");

  await expect(
    page.getByRole("heading", { name: "Todavía no publicamos los precios" }),
  ).toBeVisible();

  // The specific numbers in the seed. A woman deciding where to give birth on
  // a figure nobody checked is the failure this gate exists to prevent.
  const body = (await page.locator("body").textContent()) ?? "";
  for (const amount of ["18.000.000", "9.000.000", "450.000", "800.000"]) {
    expect(body, `unreviewed figure rendered: ${amount}`).not.toContain(amount);
  }
});

test("the empty state still answers the question it can answer", async ({ page }) => {
  await page.goto("/herramientas/precios");
  // The one price fact that needs no relevamiento: it is free, by law.
  await expect(page.getByText(/no se te cobran/)).toBeVisible();
  await page.getByRole("link", { name: /Ver qué te corresponde/ }).first().click();
  await expect(
    page.getByRole("heading", { name: "Tus derechos y beneficios" }),
  ).toBeVisible();
});

test("the guía about IPS vs privado hands the reader the tool", async ({ page }) => {
  await page.goto("/guias/control-prenatal-ips-vs-privado");
  const related = page.getByRole("link", { name: /¿Cuánto cuesta\?/ });
  await expect(related).toBeVisible();
  await related.click();
  await expect(
    page.getByRole("heading", { name: "¿Cuánto cuesta?", level: 1 }),
  ).toBeVisible();
});
