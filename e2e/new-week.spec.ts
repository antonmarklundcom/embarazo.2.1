import { expect, test } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Semana nueva — her week turns over on her own weekday (lib/newWeek.ts).

test("the new-week card greets her on the day her week turns over, and stays closed once closed", async ({
  page,
}) => {
  // 70 days since the FUM: 10+0, so today is the first day of week 11.
  await completeOnboarding(page, { daysAgo: 70 });

  // She has only just told us her week: nothing turned over for her yet, so
  // the first Hoy after setup does not celebrate it.
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByRole("region", { name: /semana 11/ })).toHaveCount(0);

  // A returning device that last saw week 10 is greeted on the turnover day.
  await page.evaluate(() => localStorage.setItem("mibebe.newWeek.seen", "10"));
  await page.reload();
  const card = page.getByRole("region", { name: "¡Hoy empezás la semana 11!" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Cumpliste 10 semanas");
  await expect(card.getByRole("link", { name: "Ver mi semana 11" })).toHaveAttribute(
    "href",
    "/semana/11",
  );

  await card.getByRole("button", { name: "Cerrar" }).click();
  await expect(card).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByRole("region", { name: /semana 11/ })).toHaveCount(0);
});

test("mid-week there is no new-week card", async ({ page }) => {
  // 74 days: 10+4, well past the three-day window.
  await completeOnboarding(page, { daysAgo: 74 });
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByText("Semana nueva", { exact: true })).toHaveCount(0);
});

test("a slow first install offers 'Probá de nuevo' instead of calling the notice blocked", async ({
  page,
  context,
}) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  // A phone whose service worker never becomes ready: she says yes, the
  // permission is granted, and `enablePush` gives up after its long wait with
  // "pending" (lib/push/client.ts). The two waits (6 s passive, 25 s explicit)
  // are shortened so the test does not sit through them.
  await context.route("**/api/v1/push", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { publicKey: "BNtestkey" } })
      : route.fulfill({ status: 204, body: "" }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator.serviceWorker, "ready", {
      configurable: true,
      get: () => new Promise(() => {}),
    });
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => "default" });
    (window as unknown as { asks: number }).asks = 0;
    Notification.requestPermission = async () => {
      (window as unknown as { asks: number }).asks += 1;
      return "granted";
    };
    const realSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      realSetTimeout(fn, ms === 6000 || ms === 25_000 ? 150 : ms, ...args)) as typeof window.setTimeout;
  });
  await page.evaluate(() => localStorage.setItem("mibebe.newWeek.seen", "10"));
  await page.reload();

  const card = page.getByRole("region", { name: "¡Hoy empezás la semana 11!" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /^Avisame cada/ }).click();

  // Not a refusal: no "No pudimos activar", no pointer to Ajustes.
  const retry = card.getByRole("button", { name: "Probá de nuevo" });
  await expect(retry).toBeVisible();
  await expect(card.getByText("Todavía no pudimos preparar los avisos")).toBeVisible();
  await expect(card.getByText("No pudimos activar los avisos")).toHaveCount(0);

  // The retry asks again (and, with the worker still stuck, lands back here).
  await retry.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { asks: number }).asks)).toBe(2);
  await expect(retry).toBeVisible();
});
