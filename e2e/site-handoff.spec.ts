import { test, expect, type Page } from "@playwright/test";

// F12 — the calculator on embarazo.com.py hands its date to the app in the URL
// fragment, which the browser never sends anywhere, under the key that says
// which date she typed. Old `?fpp=` links keep working.

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function reachDateStep(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
}

test("a FUM from the calculator arrives as a FUM, and never in a request", async ({ page }) => {
  const fum = isoDaysFromToday(-70);
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.goto(`/#fum=${fum}`);
  await reachDateStep(page);

  await expect(page.locator("#method")).toHaveValue("lmp");
  await expect(page.locator("#lmp")).toHaveValue(fum);
  expect(await page.evaluate(() => location.hash)).toBe("");
  expect(requested.filter((url) => url.includes(fum))).toEqual([]);
});

test("a due date from the calculator prefills the due-date step", async ({ page }) => {
  const fpp = isoDaysFromToday(150);
  await page.goto(`/#fpp=${fpp}`);
  await reachDateStep(page);

  await expect(page.locator("#method")).toHaveValue("ecografia");
  await expect(page.locator("#due")).toHaveValue(fpp);
});

test("an old query link still works and is dropped from the address bar", async ({ page }) => {
  const fpp = isoDaysFromToday(150);
  await page.goto(`/?fpp=${fpp}&w=20`);
  await reachDateStep(page);

  await expect(page.locator("#due")).toHaveValue(fpp);
  expect(await page.evaluate(() => location.search)).toBe("");
});
