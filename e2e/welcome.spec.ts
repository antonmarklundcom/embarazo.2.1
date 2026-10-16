import { expect, test } from "@playwright/test";

test("welcome explains the app before asking for an account and keeps the requested tool", async ({ page }) => {
  await page.goto("/cuenta?returnTo=%2Fherramientas%2Fpeso");
  await expect(page).toHaveTitle(/Tu embarazo, con más calma/);
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Lo que podés hacer con Mi Bebé" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Seguir sin cuenta" })).toHaveCount(0);
  await page.getByRole("link", { name: "Empezar mi seguimiento" }).click();
  await expect(page.getByRole("heading", { name: "Tu embarazo, organizado en un solo lugar" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/herramientas/peso");
  expect(new URL(page.url()).searchParams.get("ingreso")).toBe("1");
  await expect(page).toHaveTitle(/Tu cuenta/);
  await page.getByRole("link", { name: "Conocé Mi Bebé" }).click();
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/herramientas/peso");
});

test("welcome offers public advice without starting personal setup", async ({ page }) => {
  await page.goto("/cuenta");
  await page.getByRole("link", { name: "Ver consejos", exact: true }).click();
  await expect(page).toHaveURL(/\/guias$/);
  await expect(page.getByRole("heading", { name: "Consejos para vos", exact: true })).toBeVisible();
});

test("login errors and account deletion do not hide behind welcome", async ({ page }) => {
  await page.goto("/cuenta?error=AccessDenied");
  await expect(page.getByRole("heading", { name: "Tu embarazo, organizado en un solo lugar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toHaveCount(0);
  await page.goto("/cuenta?cuenta=borrada&limpieza=pendiente");
  await expect(page.getByRole("heading", { name: "Tu cuenta fue borrada" })).toBeVisible();
  await expect(page.getByText(/no pudimos confirmar la limpieza/)).toBeVisible();
});

test("a returning device opens login while an explicit welcome link stays available", async ({ page }) => {
  await page.goto("/cuenta?bienvenida=1");
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("mibebe");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("syncState", "readwrite");
      transaction.objectStore("syncState").put({ key: "default", lastPulledAt: 0, accountId: "welcome-test-owner" });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.goto("/cuenta");
  await expect(page.getByRole("heading", { name: "Volvé a tu embarazo" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("ingreso")).toBe("1");
  expect(new URL(page.url()).searchParams.get("vuelvo")).toBe("1");
  await expect(page).toHaveTitle(/Tu cuenta/);
  await page.getByRole("link", { name: "Conocé Mi Bebé" }).click();
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("bienvenida")).toBe("1");
});

for (const width of [360, 1280]) {
  test(`welcome fits a ${width}px viewport with reachable public and account links`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/cuenta?bienvenida=1");
    await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: "Empezar mi seguimiento" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver consejos", exact: true })).toBeVisible();
  });
}

test("'Ya tengo una cuenta' opens sign-in worded for a returning user", async ({ page }) => {
  await page.goto("/cuenta?returnTo=%2Fherramientas%2Fpeso");
  await page.getByRole("link", { name: "Ya tengo una cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Volvé a tu embarazo" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/herramientas/peso");
  // The local preview has no sign-in provider, so the consent form itself is
  // asserted in components/account-entry.test.ts (unchecked, still required).
  // "Empezar mi seguimiento" keeps the sign-up wording.
  await page.goto("/cuenta?returnTo=%2F");
  await page.getByRole("link", { name: "Empezar mi seguimiento" }).click();
  await expect(page.getByRole("heading", { name: "Tu embarazo, organizado en un solo lugar" })).toBeVisible();
});
