import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

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

test("the counter takes the reader's week, which K5 put back on purpose", async ({
  request,
}) => {
  // J3 stripped it to protect a "No data collected" badge; §5 D2 gave the badge
  // up, and without the week "lo más leído esta semana" meant "in the last
  // seven days" rather than "by women as far along as you".
  const res = await request.post("/api/v1/stats", {
    data: { contentId: "guia", week: 24 },
  });
  expect(res.status()).toBe(204);
});

test("the counter still refuses a body carrying anything else", async ({ request }) => {
  // Not ignored — rejected, so a client that starts sending an identity breaks
  // loudly instead of transmitting it.
  for (const extra of [
    { userId: "u1" },
    { department: "capital" },
    { trimester: 2 },
    // Out of range: the column must not become an integer store.
    { week: 99 },
  ]) {
    const res = await request.post("/api/v1/stats", {
      data: { contentId: "guia", ...extra },
    });
    expect(res.status(), Object.keys(extra)[0]).toBe(400);
  }
});

test("the GET takes no parameters, so there is one cache key for everybody", async ({
  request,
}) => {
  // K5 (§7): the week goes on the POST, never in a URL. A ?week= would put a
  // health datum somewhere proxies and logs can see it.
  const res = await request.get("/api/v1/stats?week=24");
  expect(res.status()).toBe(400);
});

test("the home screen shows no empty 'lo más leído' rail", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 140 });

  await expect(page.getByRole("region", { name: "Lo más leído esta semana" })).toHaveCount(
    0,
  );
});
