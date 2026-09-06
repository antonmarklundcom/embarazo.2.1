import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN D7 — the 5-1-1 contraction hint and the kicks-history nudge.
// Both are silent by default: these specs assert the hint appears with a
// seeded pattern and stays absent with a thin one, the same shape
// `e2e/symptom-insight.spec.ts` uses for K9/F3.

async function seedContractions(
  page: import("@playwright/test").Page,
  entries: { startedAt: number; durationSec: number; intervalSec: number }[],
) {
  await page.evaluate(async (rows) => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    const tx = database.transaction("contractionEntries", "readwrite");
    const store = tx.objectStore("contractionEntries");
    rows.forEach((row, i) => {
      store.add({
        ...row,
        uid: `e2e-contraction-${i}`,
        updatedAt: row.startedAt,
        deletedAt: null,
        dirty: 1,
      });
    });
    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
  }, entries);
}

async function seedKickSessions(
  page: import("@playwright/test").Page,
  sessions: { startedAt: number; count: number; completedAt: number }[],
) {
  await page.evaluate(async (rows) => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    const tx = database.transaction("kickSessions", "readwrite");
    const store = tx.objectStore("kickSessions");
    rows.forEach((row, i) => {
      store.add({
        ...row,
        uid: `e2e-kicks-${i}`,
        updatedAt: row.startedAt,
        deletedAt: null,
        dirty: 1,
      });
    });
    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
  }, sessions);
}

test("the 5-1-1 hint appears with a matching hour and stays absent with a thin one", async ({
  page,
}) => {
  // Past 37 weeks so the hint is not suppressed by gestational age.
  await completeOnboarding(page, { daysAgo: 255 });
  await page.goto("/herramientas/contracciones");

  const now = Date.now();
  const sevenContractions = Array.from({ length: 7 }, (_, i) => {
    const startedAt = now - (6 - i) * 5 * 60 * 1000;
    return { startedAt, durationSec: 60, intervalSec: i === 0 ? 0 : 300 };
  });
  await seedContractions(page, sevenContractions);
  await page.reload();

  await expect(page.getByText("es momento de llamar a tu sanatorio")).toBeVisible();

  // A thin history (well under the threshold) must say nothing.
  await page.evaluate(async () => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    const tx = database.transaction("contractionEntries", "readwrite");
    tx.objectStore("contractionEntries").clear();
    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
  });
  const now2 = Date.now();
  await seedContractions(page, [
    { startedAt: now2 - 20 * 60 * 1000, durationSec: 40, intervalSec: 0 },
    { startedAt: now2 - 10 * 60 * 1000, durationSec: 40, intervalSec: 600 },
  ]);
  await page.goto("/herramientas/contracciones");
  await expect(page.getByText("es momento de llamar a tu sanatorio")).toHaveCount(0);
});

test("the kicks nudge appears when today is well under her own baseline, and stays absent otherwise", async ({
  page,
}) => {
  await completeOnboarding(page, { daysAgo: 140 });
  await page.goto("/herramientas/pataditas");

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  // Seven prior sessions: 10 kicks in 20 minutes = 5 kicks / 10 min baseline.
  const prior = Array.from({ length: 7 }, (_, i) => {
    const startedAt = now - (i + 2) * 24 * hour;
    return { startedAt, count: 10, completedAt: startedAt + 20 * 60 * 1000 };
  });
  // Today: 2 kicks in 20 minutes — well under half the baseline.
  const today = { startedAt: now - hour, count: 2, completedAt: now - hour + 20 * 60 * 1000 };
  await seedKickSessions(page, [...prior, today]);
  await page.reload();

  await expect(page.getByText("menos que tu ritmo habitual")).toBeVisible();
});

test("the kicks nudge stays silent with fewer than 3 prior sessions", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 140 });
  await page.goto("/herramientas/pataditas");

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const sessions = [
    { startedAt: now - 3 * 24 * hour, count: 10, completedAt: now - 3 * 24 * hour + 20 * 60 * 1000 },
    { startedAt: now - hour, count: 1, completedAt: now - hour + 20 * 60 * 1000 },
  ];
  await seedKickSessions(page, sessions);
  await page.reload();

  await expect(page.getByText("menos que tu ritmo habitual")).toHaveCount(0);
});
