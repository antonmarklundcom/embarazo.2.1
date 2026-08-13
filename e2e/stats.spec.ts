import { test, expect } from "@playwright/test";

// BUILD-PLAN C7 (feature map #16). This build has no database, which is the
// "seguir sin cuenta" / local-only configuration the app must keep working in —
// so the counter accepts writes without failing, answers an empty list, and the
// home rail does not render an empty "lo más leído" box.

test("the counter degrades to nothing without a database", async ({ request }) => {
  const post = await request.post("/api/v1/stats", {
    data: { contentId: "senales-de-alarma-embarazo" },
  });
  expect(post.status()).toBe(204);

  const get = await request.get("/api/v1/stats");
  expect(get.status()).toBe(200);
  expect((await get.json()).popular).toEqual([]);
});

test("the counter refuses a body carrying anything else", async ({ request }) => {
  const res = await request.post("/api/v1/stats", {
    data: { contentId: "guia", week: 24 },
  });
  // Not ignored — rejected, so a client that starts sending a week breaks
  // loudly instead of transmitting it while the listing says otherwise.
  expect(res.status()).toBe(400);
});

test("the home screen shows no empty 'lo más leído' rail", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  const lmp = new Date(Date.now() - 140 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  await expect(page.getByRole("region", { name: "Lo más leído esta semana" })).toHaveCount(
    0,
  );
});
