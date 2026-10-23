import { test, expect, type BrowserContext } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";

const owner = { providers: [], credentialsAvailable: false, accountRequired: true, signedIn: true, accountId: "review-owner" };
async function signedIn(context: BrowserContext) {
  await context.route("**/api/v1/auth-status", route => route.fulfill({ json: owner }));
  await context.route("**/api/v1/sync**", route => route.fulfill({ json: route.request().method() === "POST"
    ? { results: [], serverTime: Date.now(), accountId: owner.accountId }
    : { records: [], serverTime: Date.now(), accountId: owner.accountId } }));
}
test("same-owner focus recheck locks but retains diary draft and focus", async ({ page, context }) => {
  await completeOnboarding(page);
  await signedIn(context);
  await page.goto("/herramientas/diario");
  const note = page.locator("#entrada");
  await note.fill("Synthetic draft remains private");
  let release!: () => void;
  const delay = new Promise<void>(resolve => { release = resolve; });
  await context.route("**/api/v1/auth-status", async route => { await delay; await route.fulfill({ json: owner }).catch(() => {}); });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Comprobando tu cuenta…", { exact: true })).toBeVisible();
  await expect(note).toHaveCount(1);
  await expect(note).toBeHidden();
  release();
  await expect(note).toBeVisible();
  await expect(note).toHaveValue("Synthetic draft remains private");
  await expect(note).toBeFocused();
});
test("connected-but-unreachable verification admits only a valid owner grant; explicit 401 revokes", async ({ page, context }) => {
  await completeOnboarding(page);
  await signedIn(context);
  await page.goto("/herramientas/diario");
  await page.locator("#entrada").fill("Keep during network failure");
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await context.route("**/api/v1/auth-status", route => route.abort());
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Sin internet: estás viendo los registros guardados de tu cuenta.")).toBeVisible();
  await expect(page.locator("#entrada")).toHaveValue("Keep during network failure");
  await context.route("**/api/v1/auth-status", route => route.fulfill({ status: 401, json: { error: "signed out" } }));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/cuenta/);
  await expect(page.locator("#entrada")).toHaveCount(0);
});
test("failed sync requires an explicit local-only backup and never claims remote completeness", async ({ page, context }) => {
  await completeOnboarding(page);
  await signedIn(context);
  await page.goto("/ajustes");
  await expect(page.getByRole("button", { name: "Descargar mis datos", exact: true })).toBeVisible();
  await context.route("**/api/v1/sync**", route => route.fulfill({ status: 503, json: { error: "synthetic outage" } }));
  let downloads = 0;
  page.on("download", () => { downloads += 1; });
  await page.getByRole("button", { name: "Descargar mis datos", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos confirmar" })).toBeVisible();
  expect(downloads).toBe(0);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar solo la copia de este teléfono" }).click();
  await downloaded;
  await expect(page.getByText("Copia local descargada. Puede faltar lo cargado desde otros aparatos.")).toBeVisible();
});
