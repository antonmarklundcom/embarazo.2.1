import { expect, test } from "@playwright/test";

import { gotoPrecached, waitForPrecache } from "./helpers/offline";

// Owner report, 17 Oct 2026: on the installed app every private screen stayed
// on "Abriendo tu embarazo…" while Guías and SOS still opened. Cause: page
// routes were precached as bare URLs, which Serwist never refreshes, so a phone
// kept the first install's HTML naming chunks a later deploy deleted.

test("precached pages carry a per-build revision, so a new deploy refreshes them", async ({ page }) => {
  await page.goto("/guias");
  await waitForPrecache(page, ["/", "/guias", "/herramientas/checklist"]);
  const keys = await page.evaluate(async () => {
    const found: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) {
        const url = new URL(request.url);
        if (["/", "/guias", "/herramientas/checklist"].includes(url.pathname)) found.push(url.pathname + url.search);
      }
    }
    return found;
  });
  expect(keys.length).toBeGreaterThanOrEqual(3);
  for (const key of keys) expect(key).toMatch(/[?&]__WB_REVISION__=[a-z0-9]+/);
});

test.describe("with no JavaScript at all", () => {
  test.use({ javaScriptEnabled: false });

  test("a private screen still offers the repair page after a few seconds", async ({ page }) => {
    await page.goto("/herramientas/checklist");
    await expect(page.getByText("Abriendo tu embarazo…")).toBeVisible();
    const repair = page.getByRole("link", { name: "Reparar la app" });
    await expect(repair).toBeHidden();
    await expect(repair).toBeVisible({ timeout: 15_000 });
    await expect(repair).toHaveAttribute("href", "/reparar");
  });
});

test("same-build repair keeps offline pages and local data, then reopens the app", async ({ page, context }) => {
  await page.goto("/guias");
  await waitForPrecache(page, ["/emergencia", "/semana/42"]);
  await page.evaluate(async () => {
    await (await caches.open("pages")).put("/stale-page", new Response("old"));
    localStorage.setItem("mibebe.repair-test", "kept");
  });
  await page.goto("/reparar");
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  // The repair redirect must finish mounting before a later navigation can race it.
  await expect(page.getByRole("button", { name: /^Estoy embarazada/ })).toBeVisible();
  const after = await page.evaluate(async () => ({
    stale: Boolean(await (await caches.open("pages")).match("/stale-page")),
    emergency: Boolean(await caches.match("/emergencia", { ignoreSearch: true })),
    week: Boolean(await caches.match("/semana/42", { ignoreSearch: true })),
    kept: localStorage.getItem("mibebe.repair-test"),
  }));
  expect(after.stale).toBe(false);
  expect(after.kept).toBe("kept");
  expect(after.emergency).toBe(true);
  expect(after.week).toBe(true);
  await context.setOffline(true);
  await page.goto("about:blank");
  await gotoPrecached(page, "/emergencia");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.goto("about:blank");
  await gotoPrecached(page, "/semana/42");
  await expect(page.getByRole("region", { name: "Tu bebé en la semana 42", exact: true })).toBeVisible();
  await context.setOffline(false);
});
