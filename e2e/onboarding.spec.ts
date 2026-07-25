import { test, expect } from "@playwright/test";
import { completeOnboarding, isoDaysAgo, isoDaysAhead } from "./helpers";

// P1.7 + BUILD-PLAN B1/B2/B3: complete onboarding across modes, roles and
// every date-entry method. Each test gets a fresh browser context (isolated
// IndexedDB/localStorage), so no cleanup is needed between runs.

test("embarazada mode via last menstrual period date", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bienvenida a Mi Bebé" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  await page.locator("#lmp").fill(isoDaysAgo(70));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click(); // skip nickname

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("embarazada mode via due date", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  await page.getByRole("button", { name: "Calcular de otra forma" }).click();
  await page.getByRole("button", { name: /Fecha probable de parto/ }).click();
  await page.locator("#due").fill(isoDaysAhead(150));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

// FEATURE-MAP #4: in Paraguay this is often the only thing a woman knows, so
// it must be a first-class path rather than a conversion she does in her head.
test("embarazada mode via what the ultrasound said", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  await page.getByRole("button", { name: "Calcular de otra forma" }).click();
  await page.getByRole("button", { name: /Lo que dijo la ecografía/ }).click();

  await page.locator("#scan").fill(isoDaysAgo(14));
  await page.locator("#scanWeeks").fill("12");
  await page.locator("#scanDays").selectOption("3");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("embarazada mode via IVF transfer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  await page.getByRole("button", { name: "Calcular de otra forma" }).click();
  await page
    .getByRole("button", { name: /Tratamiento de fertilidad/ })
    .click();

  await page.locator("#transfer").fill(isoDaysAgo(60));
  await page.getByRole("button", { name: "Día 3" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("an incomplete date cannot advance", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/Completá los datos/)).toBeVisible();
});

test("a nickname entered in onboarding is saved", async ({ page }) => {
  await completeOnboarding(page, { nickname: "Poroto" });

  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string | undefined>((resolve) => {
      const tx = database.transaction("babies", "readonly");
      const all = tx.objectStore("babies").getAll();
      all.onsuccess = () => resolve(all.result[0]?.nickname);
    });
  });

  expect(stored).toBe("Poroto");
});

test("papá role reaches a working home screen", async ({ page }) => {
  await completeOnboarding(page, { roleLabel: "Soy el papá" });
  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("planeando mode skips the pregnancy date step", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy planeando / buscando" }).click();
  await page.getByRole("button", { name: "Soy la mamá" }).click();

  // No date or nickname step for this mode — straight to department.
  await expect(page.locator("#dep")).toBeVisible();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(
    page.getByRole("heading", { name: "Estás planeando tu embarazo" }),
  ).toBeVisible();
});
