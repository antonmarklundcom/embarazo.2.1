import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { serveClientFlags } from "./helpers/flags";
import { openHomeSection } from "./helpers/homeSections";
import { completeOnboarding } from "./helpers/onboarding";

// "Pregunta del día" on Hoy (components/home/DailyQuestionCard.tsx). CI has no
// database, so the counter answers 204 and the results endpoint answers
// zeros; the specs that need numbers serve their own.

// 24+3 completed, which the app calls week 25: second trimester.
const DAYS_AGO = 24 * 7 + 3;
const THANKS = "Gracias. Cuando haya más respuestas vas a ver cómo respondieron otras mamás.";

function card(page: Page) {
  return page.getByRole("region", { name: "Pregunta del día" });
}

/** Every request to the poll endpoints this context makes, the worker's included. */
async function recordPollRequests(context: BrowserContext) {
  const posts: unknown[] = [];
  const gets: string[] = [];
  await context.route("**/api/v1/poll", async (route) => {
    if (route.request().method() === "POST") posts.push(route.request().postDataJSON());
    await route.continue();
  });
  context.on("request", (request) => {
    if (/\/api\/v1\/poll\//.test(request.url())) gets.push(request.url());
  });
  return { posts, gets };
}

/** Serve results for whatever question today is, from counts per trimester. */
async function serveResults(context: BrowserContext, byTrimester: Record<1 | 2 | 3, number[]>) {
  await context.route("**/api/v1/poll/*", (route) => {
    const questionId = new URL(route.request().url()).pathname.split("/").pop()!;
    const keys = ["a", "b", "c", "d"];
    const trimesters = ([1, 2, 3] as const).map((trimester) => ({
      trimester,
      counts: Object.fromEntries(byTrimester[trimester].map((count, i) => [keys[i], count])),
    }));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ questionId, trimesters }),
    });
  });
}

test("flag off: no card and nothing sent", async ({ page, context }) => {
  const requests = await recordPollRequests(context);
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(card(page)).toHaveCount(0);
  expect(requests.posts).toEqual([]);
  expect(requests.gets).toEqual([]);
});

test("flag on: a tap marks the answer, sends one count, and a reload keeps it", async ({ page, context }) => {
  await serveClientFlags(context, { preguntaDelDia: true });
  const requests = await recordPollRequests(context);
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  const options = card(page).getByRole("group", { name: "Respuestas" }).getByRole("button");
  await expect(card(page)).toBeVisible();
  expect(await options.count()).toBeGreaterThanOrEqual(2);
  const label = (await options.first().innerText()).trim();

  await options.first().click();
  await expect(options.first()).toHaveAttribute("aria-pressed", "true");
  // Under the threshold (no database here): the thank-you, not bars.
  await expect(card(page).getByText(THANKS)).toBeVisible();
  await expect(card(page).locator("[data-poll-results]")).toHaveCount(0);

  // The others cannot be picked any more, and a second tap sends nothing.
  await expect(options.nth(1)).toBeDisabled();
  await options.first().click();
  await page.waitForTimeout(1500);
  expect(requests.posts).toHaveLength(1);
  expect(requests.posts[0]).toEqual({
    questionId: expect.stringMatching(/^[a-z0-9-]+$/),
    optionKey: "a",
    week: 25,
  });

  // Coming back the same day: answered, and nothing sent again.
  await page.reload();
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  await expect(card(page).getByText(THANKS)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(requests.posts).toHaveLength(1);
  // Her answer is on the device, under its one key.
  const stored = await page.evaluate(() => localStorage.getItem("mibebe.pregunta.respuestas"));
  expect(Object.values(JSON.parse(stored ?? "{}"))).toEqual(["a"]);
});

test("results stay hidden under the threshold in HER trimester", async ({ page, context }) => {
  await serveClientFlags(context, { preguntaDelDia: true });
  // 29 in the second trimester (hers), plenty in the others.
  await serveResults(context, { 1: [40, 20, 10, 5], 2: [10, 9, 6, 4], 3: [50, 30, 20, 10] });
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  await card(page).getByRole("group", { name: "Respuestas" }).getByRole("button").first().click();
  await expect(card(page).getByText(THANKS)).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(card(page).locator("[data-poll-results]")).toHaveCount(0);
});

test("with enough answers, the bars show percentages that add up to 100", async ({ page, context }) => {
  await serveClientFlags(context, { preguntaDelDia: true });
  await serveResults(context, { 1: [0, 0, 0, 0], 2: [13, 9, 5, 4], 3: [0, 0, 0, 0] });
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  await card(page).getByRole("group", { name: "Respuestas" }).getByRole("button").first().click();
  const results = card(page).locator("[data-poll-results]");
  await expect(results).toBeVisible();
  await expect(card(page).getByText("Así respondieron otras mamás")).toBeVisible();
  await expect(card(page).getByText(THANKS)).toHaveCount(0);

  const shares = await results.locator("[data-poll-share]").allInnerTexts();
  expect(shares.length).toBeGreaterThanOrEqual(2);
  const numbers = shares.map((text) => Number(text.replace("%", "").trim()));
  expect(numbers.reduce((sum, value) => sum + value, 0)).toBe(100);
  // Her answer is marked among them.
  await expect(results.locator("[data-poll-option='a']")).toContainText("tu respuesta");
});

test("the server refuses an unknown question or option", async ({ request }) => {
  for (const data of [
    { questionId: "no-existe", optionKey: "a" },
    { questionId: "nombre-pensado", optionKey: "z" },
    { questionId: "nombre-pensado", optionKey: "a", userId: "u1" },
  ]) {
    const res = await request.post("/api/v1/poll", { data });
    expect(res.status(), JSON.stringify(data)).toBe(400);
  }
  expect((await request.post("/api/v1/poll", { data: { questionId: "nombre-pensado", optionKey: "a" } })).status()).toBe(204);
  // The read side takes the question id only.
  expect((await request.get("/api/v1/poll/nombre-pensado")).status()).toBe(200);
  expect((await request.get("/api/v1/poll/nombre-pensado?week=24")).status()).toBe(400);
  expect((await request.get("/api/v1/poll/no-existe")).status()).toBe(400);
  // And the content-view counter will not take a poll id around that check.
  expect((await request.post("/api/v1/stats", { data: { contentId: "poll-nombre-pensado-a" } })).status()).toBe(400);
});

test("poll ids never show in «lo más leído esta semana»", async ({ page, context }) => {
  // Even if a payload carried them (the query and the ranking both drop them,
  // lib/server/statsRanking.test.ts), the rail shows only guías.
  await context.route("**/api/v1/stats", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            // Everybody (0) and her own bucket, week 25 (5).
            popular: [0, 5].map((bucket) => ({
              bucket,
              items: [
                { contentId: "poll-nombre-pensado-a", views: 900 },
                { contentId: "que-llevar-al-sanatorio", views: 5 },
              ],
            })),
          }),
        })
      : route.continue(),
  );
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  await openHomeSection(page, "Tu semana");

  const rail = page.getByRole("region", { name: "Lo más leído esta semana" });
  await expect(rail).toBeVisible();
  const links = rail.getByRole("link");
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute("href", "/guias/que-llevar-al-sanatorio");
  await expect(rail).not.toContainText("poll");
});
