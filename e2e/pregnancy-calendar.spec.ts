import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";
import { localDateInput } from "./helpers/dates";

async function savedPregnancy(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("mibebe");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ lmpDate: number; dueDate: number; gestationDays?: number; method?: string }>((resolve, reject) => {
        const read = database.transaction("pregnancy").objectStore("pregnancy").getAll();
        read.onsuccess = () => resolve(read.result.find((row) => !row.deletedAt));
        read.onerror = () => reject(read.error);
      });
    } finally {
      database.close();
    }
  });
}

for (const duration of [266, 280, 294]) {
  test(`date editing preserves ${duration}-day duration and both FUM/FPP round trips`, async ({ page }) => {
    await completeOnboarding(page, { daysAgo: 120 });
    await page.goto("/ajustes");
    await page.getByRole("spinbutton", { name: "Duración del embarazo, en días" }).fill(String(duration));
    await page.getByRole("button", { name: "Guardar duración", exact: true }).click();
    await expect(page.getByText("Duración actualizada. Tu fecha probable de parto se recalculó.")).toBeVisible();
    await page.locator("#lmp-edit").fill(localDateInput(-121));
    await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
    await expect(page.getByText("Fecha actualizada. Tu semana se recalculó.")).toBeVisible();
    const fromLmp = await savedPregnancy(page);
    expect(fromLmp.gestationDays).toBe(duration);
    expect(fromLmp.method).toBe("lmp");
    const dueInput = await page.evaluate((due) => {
      const date = new Date(due);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }, fromLmp.dueDate);
    await page.getByRole("checkbox", { name: /No sé mi última regla/ }).check();
    await expect(page.getByText(`Calculamos tu última regla restando ${duration} días a esta fecha.`)).toBeVisible();
    await page.locator("#due-edit").fill(dueInput);
    await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
    await expect.poll(async () => (await savedPregnancy(page)).method).toBe("ecografia");
    const fromDue = await savedPregnancy(page);
    expect(fromDue.lmpDate).toBe(fromLmp.lmpDate);
    expect(fromDue.dueDate).toBe(fromLmp.dueDate);
    expect(fromDue.gestationDays).toBe(duration);
    await page.goto("/");
    const dueLabel = await page.evaluate((due) => new Date(due).toLocaleDateString("es-PY", { day: "numeric", month: "short" }), fromDue.dueDate);
    const stat = page.getByText("Fecha probable", { exact: true }).locator("..");
    await expect(stat).toContainText(dueLabel);
  });
}

test("midnight/resume updates all week displays and cannot revive an old browsing selection", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await completeOnboarding(page, { daysAgo: 146 });
  const overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  const title = overview.getByText(/^Semana \d+$/);
  await expect(title).toHaveText("Semana 21");
  for (let index = 0; index < 3; index++) await overview.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(title).toHaveText("Semana 24");
  const beforeMidnight = await page.evaluate(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  });
  await page.clock.setSystemTime(beforeMidnight + 86_400_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(title).toHaveText("Semana 22");
  await page.clock.setSystemTime(beforeMidnight);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(title).toHaveText("Semana 21");
  await expect(overview.getByText("Tu semana actual", { exact: true })).toBeVisible();
  await page.clock.runFor(1100);
  await expect(title).toHaveText("Semana 22");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("21 semanas y 0 días");
  await expect(page.getByText("Días pasados", { exact: true }).locator("..")).toContainText("147");
  await expect(page.getByText("Faltan", { exact: true }).locator("..")).toContainText("133");
  const notice = page.getByRole("heading", { name: "¡Hoy empezás la semana 22!", exact: true });
  await expect(notice).toBeVisible();
  await page.clock.setSystemTime(beforeMidnight + 4 * 86_400_000 + 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("heading", { name: /empez.*semana 22/i })).toHaveCount(0);
  await page.clock.setSystemTime(beforeMidnight + 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(notice).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("mibebe.newWeek.seen", "22");
    window.dispatchEvent(new StorageEvent("storage", { key: "mibebe.newWeek.seen", newValue: "22" }));
  });
  await expect(notice).toHaveCount(0);
});

test("overview respects both week bounds and supports keyboard tab edges and focusable content", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 0 });
  let overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  await expect(overview.getByRole("button", { name: "Semana anterior", exact: true })).toBeDisabled();
  await overview.getByRole("tab", { name: "Para vos", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(overview.getByRole("tab", { name: "Para la familia", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview.getByRole("tab", { name: "Para vos", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(overview.getByRole("tabpanel")).toBeFocused();
  await page.goto("/ajustes");
  await page.locator("#lmp-edit").fill(localDateInput(-287));
  await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
  await expect(page.getByText("Fecha actualizada. Tu semana se recalculó.")).toBeVisible();
  await page.goto("/");
  overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  await expect(overview.getByText("Semana 42", { exact: true })).toBeVisible();
  await expect(overview.getByRole("button", { name: "Semana siguiente", exact: true })).toBeDisabled();
  await overview.getByRole("button", { name: "Semana anterior", exact: true }).click();
  await expect(overview.getByText("Explorando semana 41", { exact: true })).toBeVisible();
  await overview.getByRole("button", { name: "Volver a mi semana", exact: true }).click();
  await expect(overview.getByText("Tu semana actual", { exact: true })).toBeVisible();
});
