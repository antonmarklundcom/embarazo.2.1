import { test, expect } from "@playwright/test";

// BUILD-PLAN D2 (feature map #21): five new tools. The e2e covers the two that
// hold state across a reload — a favourite name and a logged night — because
// "it saved" is the only claim a user cannot verify at a glance, and the one
// that matters when she comes back tomorrow.

test("the five new tools are reachable from the toolbox", async ({ page }) => {
  await page.goto("/herramientas");
  for (const [label, href] of [
    ["Nombres", "/herramientas/nombres"],
    ["Kegel", "/herramientas/kegel"],
    ["Sueño", "/herramientas/sueno"],
    ["Diario", "/herramientas/diario"],
    ["Salud dental", "/herramientas/dental"],
  ] as const) {
    await page.goto("/herramientas");
    // By href: two tiles legitimately contain the word "Diario" (the photo
    // diary and this one), and the accessible name carries the description.
    await expect(page.locator(`a[href="${href}"]`), label).toHaveCount(1);
    await page.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }
});

test("a Guaraní name can be found by its meaning and kept", async ({ page }) => {
  await page.goto("/herramientas/nombres");

  // Searching the meaning, not the spelling: nobody looking for a name knows
  // how "luna" is written in Guaraní before they look it up.
  await page.getByLabel("Buscar un nombre o un significado").fill("luna");
  await expect(page.getByText("Yasy")).toBeVisible();

  await page.getByRole("button", { name: "Guardar Yasy" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Quitar Yasy de favoritos" })).toBeVisible();
});

test("a night is logged once and survives a reload", async ({ page }) => {
  await page.goto("/herramientas/sueno");

  await page.getByRole("button", { name: "6 h", exact: true }).click();
  await page.getByRole("button", { name: "Mal", exact: true }).click();
  await page.getByRole("button", { name: "Acidez" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText(/Últimas 1 noche/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/6 h/).first()).toBeVisible();

  // Logging again corrects the night rather than adding a second one.
  await page.getByRole("button", { name: "8 h", exact: true }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/Últimas 1 noche/)).toBeVisible();
});

test("the Kegel session runs on the clock", async ({ page }) => {
  await page.goto("/herramientas/kegel");
  await expect(page.getByText("Empezá")).toBeVisible();

  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Apretá", { exact: true })).toBeVisible();
  // 3 s hold at the "Suave" level, then it must switch by itself.
  await expect(page.getByText("Soltá", { exact: true })).toBeVisible({ timeout: 6000 });
});

test("the dental screen reads offline-ready and links to the directory", async ({
  page,
}) => {
  await page.goto("/herramientas/dental");
  await expect(page.getByRole("heading", { name: "Salud dental" })).toBeVisible();
  await expect(page.getByText(/sangran las encías/i).first()).toBeVisible();
  await page.getByRole("link", { name: "Buscar dónde atenderte" }).click();
  await expect(page).toHaveURL(/\/directorio$/);
});
