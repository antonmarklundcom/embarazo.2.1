import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Growth plan items 16–18 — the install funnel, end to end in a real browser.
// The unit tests cover the rules (`lib/stats/funnel*.test.ts`); what only a
// browser proves is that the landing URL is read before the home page strips
// it, and that each count leaves the phone once.

type Sent = { metric: string; key: string };

async function captureFunnel(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route("**/api/v1/stats/funnel", async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}") as Sent);
    await route.fulfill({ status: 204, body: "" });
  });
  return sent;
}

test("a site + QR landing is counted once, then onboarding, first tool and a return", async ({
  page,
}) => {
  const sent = await captureFunnel(page);

  await page.goto("/?utm_source=site&utm_medium=week&utm_campaign=semana-20&src=Clinica-Sur");
  await expect.poll(() => sent.length).toBe(2);
  expect(sent).toEqual([
    { metric: "arrival", key: "week" },
    { metric: "qr", key: "clinica-sur" },
  ]);

  await completeOnboarding(page);
  await expect.poll(() => sent.some((e) => e.metric === "onboarded")).toBe(true);
  expect(sent.filter((e) => e.metric === "onboarded")).toEqual([
    { metric: "onboarded", key: "qr" },
  ]);

  await page.goto("/herramientas/contracciones");
  await expect.poll(() => sent.some((e) => e.metric === "first_tool")).toBe(true);

  // Pretend onboarding was eight days ago, then open the app again.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("mibebe.funnel") ?? "{}");
    state.onboardedAt = Date.now() - 8 * 86_400_000;
    localStorage.setItem("mibebe.funnel", JSON.stringify(state));
  });
  await page.goto("/");
  await expect.poll(() => sent.some((e) => e.metric === "return7")).toBe(true);

  // Nothing leaves twice, however often the app is opened.
  await page.goto("/?utm_source=site&utm_medium=tool&src=otra-clinica");
  await page.goto("/herramientas/contracciones");
  await page.reload();
  const counts = new Map<string, number>();
  for (const e of sent) counts.set(e.metric, (counts.get(e.metric) ?? 0) + 1);
  expect(Object.fromEntries(counts)).toEqual({
    arrival: 1,
    qr: 1,
    onboarded: 1,
    first_tool: 1,
    return7: 1,
  });
});

test("a direct visit sends nothing until onboarding, and then only 'directo'", async ({
  page,
}) => {
  const sent = await captureFunnel(page);
  await completeOnboarding(page);
  await expect.poll(() => sent.length).toBe(1);
  expect(sent).toEqual([{ metric: "onboarded", key: "directo" }]);
});

test("the endpoint takes a metric and a key, and refuses anything more", async ({
  request,
}) => {
  const ok = await request.post("/api/v1/stats/funnel", {
    data: { metric: "arrival", key: "week" },
  });
  expect(ok.status()).toBe(204);

  const extra = await request.post("/api/v1/stats/funnel", {
    data: { metric: "arrival", key: "week", deviceId: "abc" },
  });
  expect(extra.status()).toBe(400);

  const badSlug = await request.post("/api/v1/stats/funnel", {
    data: { metric: "qr", key: "Clínica Sur" },
  });
  expect(badSlug.status()).toBe(400);
});
