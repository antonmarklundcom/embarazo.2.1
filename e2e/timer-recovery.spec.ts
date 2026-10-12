import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";

async function timerRows(page: Page, store: "contractionEntries" | "kickSessions") {
  return page.evaluate(async (name) => {
    const request = indexedDB.open("mibebe");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = database.transaction(name).objectStore(name).getAll();
      return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
    } finally {
      database.close();
    }
  }, store);
}

test("a contraction resumes through emergency navigation and reload, then completes one saved row", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 262 });
  await page.goto("/herramientas/contracciones");
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Parar/ })).toBeVisible();
  const started = (await timerRows(page, "contractionEntries"))[0]!.startedAt;
  await page.goto("/emergencia");
  await page.goto("/herramientas/contracciones");
  await expect(page.getByRole("button", { name: /Parar/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Parar/ })).toBeVisible();
  expect((await timerRows(page, "contractionEntries"))[0]!.startedAt).toBe(started);
  await page.getByRole("button", { name: /Parar/ }).click();
  await expect(page.getByRole("button", { name: "Empezar", exact: true })).toBeVisible();
  const rows = await timerRows(page, "contractionEntries");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ startedAt: started, inProgress: false });
  expect(typeof rows[0]!.durationSec).toBe("number");
  await page.reload();
  await expect(page.getByRole("button", { name: /Parar/ })).toHaveCount(0);
});

test("a kick session retains its count through navigation/reload and does not reopen after finishing", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 210 });
  await page.goto("/herramientas/pataditas");
  await page.getByRole("button", { name: "Empezar una sesión" }).click();
  const count = page.getByRole("button", { name: "Registrar una patadita" });
  for (let i = 0; i < 3; i += 1) await count.click();
  await expect(count.getByText("3", { exact: true })).toBeVisible();
  await page.goto("/emergencia");
  await page.goto("/herramientas/pataditas");
  await expect(count.getByText("3", { exact: true })).toBeVisible();
  await page.reload();
  await expect(count.getByText("3", { exact: true })).toBeVisible();
  await count.click();
  await expect(count.getByText("4", { exact: true })).toBeVisible();
  expect(await timerRows(page, "kickSessions")).toHaveLength(1);
  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await expect(page.getByRole("button", { name: "Empezar una sesión" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Empezar una sesión" })).toBeVisible();
  await expect(count).toHaveCount(0);
  const rows = await timerRows(page, "kickSessions");
  expect(rows[0]!.count).toBe(4);
  expect(typeof rows[0]!.completedAt).toBe("number");
});
