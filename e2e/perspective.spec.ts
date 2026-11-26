import { test, expect } from "@playwright/test";

import familyLines from "../lib/seed/py/familyLines.json";
import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C4 (feature map #13): the same week with three entrances, opening
// on the role the user chose in onboarding (B1).

const onboard = (page: import("@playwright/test").Page, role: string) =>
  completeOnboarding(page, { role, daysAgo: 140 });

test("a mamá opens on 'para vos' and can read the other two", async ({ page }) => {
  await onboard(page, "Mamá");

  const panel = page.getByRole("tabpanel", { name: "Para vos" });
  await expect(panel).toBeVisible();

  // Nothing is hidden by role: showing the partner tab to somebody is half of
  // what this block is for.
  await page.getByRole("tab", { name: "Para tu pareja" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para tu pareja" })).toBeVisible();

  await page.getByRole("tab", { name: "Para la familia" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para la familia" })).toBeVisible();
});

// The wider family's line (lib/seed/py/familyLines.json) under the band.
test("the family tab shows the week's line for la abuela, la tía, la madrina", async ({ page }) => {
  await onboard(page, "Mamá");
  const overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  const week = Number((await overview.getByText(/^Semana \d+$/).innerText()).replace("Semana ", ""));
  const items = familyLines.items;
  const expected = items.find((item) => item.week === week)!.text;

  // Only under the family band, not the other two.
  await expect(overview.getByTestId("family-line")).toHaveCount(0);
  await overview.getByRole("tab", { name: "Para la familia", exact: true }).click();
  const line = overview.getByRole("tabpanel", { name: "Para la familia" }).getByTestId("family-line");
  await expect(line).toBeVisible();
  await expect(line.getByRole("heading", { name: "Esta semana, la familia puede…" })).toBeVisible();
  await expect(line).toContainText(expected);

  // It follows the browsed week.
  await overview.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  const next = items.find((item) => item.week === week + 1)!.text;
  await expect(line).toContainText(next);
});

test("a papá does not have to tap past the 'para vos' tab", async ({ page }) => {
  await onboard(page, "Papá");

  await expect(page.getByRole("tab", { name: "Para tu pareja" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("mobile overview wraps tabs and browses weeks without changing the pregnancy", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await onboard(page, "Mamá");
  const overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  await expect(overview).toHaveCount(1);
  const title = overview.getByText(/^Semana \d+$/);
  const initial = await title.innerText();
  const current = Number(initial.replace("Semana ", ""));
  const hero = await page.getByRole("heading", { level: 1 }).innerText();
  const tabs = overview.getByRole("tablist");
  expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const box = await overview.boundingBox();
  const later = await page.getByRole("heading", { name: "Un momento para vos" }).boundingBox();
  expect(box!.y).toBeLessThan(later!.y);
  await overview.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(title).toHaveText(`Semana ${current + 1}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(hero);
  await overview.getByRole("tab", { name: "Para la familia", exact: true }).click();
  await expect(overview.getByRole("tabpanel", { name: "Para la familia" })).toBeVisible();
  await overview.getByRole("button", { name: "Volver a mi semana", exact: true }).click();
  await expect(title).toHaveText(initial);
  await expect(overview.getByText("Tu semana actual", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const panel = overview.getByRole("tabpanel", { name: "Para la familia" });
  await panel.evaluate((el) => {
    const start = new Touch({ identifier: 1, target: el, clientX: 250, clientY: 100 });
    const end = new Touch({ identifier: 1, target: el, clientX: 80, clientY: 105 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [start], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [end], bubbles: true }));
  });
  await expect(title).toHaveText(`Semana ${current + 1}`);
  await panel.evaluate((el) => {
    const start = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 80 });
    const end = new Touch({ identifier: 1, target: el, clientX: 105, clientY: 250 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [start], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [end], bubbles: true }));
  });
  await expect(title).toHaveText(`Semana ${current + 1}`);
  await page.reload();
  await expect(title).toHaveText(initial);
  await overview.evaluate((el) => {
    window.scrollTo(0, Math.max(0, window.scrollY + el.getBoundingClientRect().top - 100));
  });
  await overview.screenshot({ path: test.info().outputPath("weekly-overview-mobile.png") });
});
