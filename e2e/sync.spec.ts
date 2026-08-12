import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// BUILD-PLAN A3 — "airplane-mode edits sync on reconnect; two profiles signed
// into the same account converge."
//
// CI has no MySQL and no OAuth, so the server is stood up here instead: a
// ~40-line in-memory implementation of the /api/v1/sync wire contract, shared
// by both browser contexts through `page.route`. What that leaves under test is
// exactly the half that cannot be unit-tested — the real client engine, the
// real Dexie v5 stores, the real stamping hooks and the real merge, driven by a
// real browser going offline and back. The server's own last-write-wins logic
// is covered separately in `lib/server/sync.test.ts`.

interface StoredRecord {
  store: string;
  recordId: string;
  updatedAt: number;
  deletedAt: number | null;
  serverUpdatedAt: number;
  payload: unknown;
}

function fakeServer() {
  const rows = new Map<string, StoredRecord>();
  let clock = 1;

  return {
    rows,
    push(records: StoredRecord[]) {
      const results = [];
      for (const record of records) {
        const key = `${record.store}|${record.recordId}`;
        const existing = rows.get(key);
        if (!existing || record.updatedAt > existing.updatedAt) {
          clock += 1;
          rows.set(key, { ...record, serverUpdatedAt: clock });
          results.push({
            store: record.store,
            recordId: record.recordId,
            outcome: "accepted",
          });
        } else {
          results.push({
            store: record.store,
            recordId: record.recordId,
            outcome: "stale",
          });
        }
      }
      return { results, serverTime: Date.now() };
    },
    pull(since: number) {
      const records = [...rows.values()]
        .filter((r) => r.serverUpdatedAt >= since)
        .sort((a, b) => a.serverUpdatedAt - b.serverUpdatedAt);
      return { records, serverTime: Date.now() };
    },
  };
}

async function serve(
  context: BrowserContext,
  server: ReturnType<typeof fakeServer>,
) {
  await context.route("**/api/v1/sync**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { records: StoredRecord[] };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(server.push(body.records)),
      });
    }
    const since = Number(new URL(request.url()).searchParams.get("since") ?? 0);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(server.pull(since)),
    });
  });
}

async function onboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  const lmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

/**
 * Force an immediate sync instead of waiting out the three-second debounce.
 * Retries once: coming back online can let a navigation that was queued while
 * offline finish, which tears down the execution context mid-evaluate.
 */
async function reconnect(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  } catch {
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  }
}

test("an offline edit reaches a second device on reconnect", async ({
  browser,
}) => {
  const server = fakeServer();

  const contextA = await browser.newContext();
  await serve(contextA, server);
  const a = await contextA.newPage();
  await onboard(a);

  // Airplane mode. Navigate first: /herramientas/peso is not in the service
  // worker's precache list, and this test is about writing offline, not about
  // the precache manifest (e2e/offline.spec.ts covers that).
  await a.goto("/herramientas/peso");
  await contextA.setOffline(true);
  await a.locator("#kg").fill("61.5");
  await a.getByRole("button", { name: /Guardar/ }).click();
  await expect(a.getByText("61,5 kg").or(a.getByText("61.5 kg"))).toBeVisible();

  // Nothing left the device while offline.
  expect(
    [...server.rows.values()].some((r) => r.store === "weightEntries"),
  ).toBe(false);

  // Reconnect.
  await contextA.setOffline(false);
  await reconnect(a);
  await expect
    .poll(() => [...server.rows.values()].filter((r) => r.store === "weightEntries").length)
    .toBe(1);

  // A second device on the same account, with an empty IndexedDB. It is NOT
  // onboarded here: the pull is expected to bring the profile and pregnancy
  // across, which is the whole "new phone, sign in, everything is there"
  // promise. If sync were broken, this device would show the onboarding gate.
  const contextB = await browser.newContext();
  await serve(contextB, server);
  const b = await contextB.newPage();
  await b.goto("/");
  await expect(b.getByText("Tip de hoy")).toBeVisible({ timeout: 15_000 });

  await b.goto("/herramientas/peso");
  await reconnect(b);

  await expect(b.getByText("61,5 kg").or(b.getByText("61.5 kg"))).toBeVisible({
    timeout: 15_000,
  });

  await contextA.close();
  await contextB.close();
});

test("a deletion propagates instead of coming back", async ({ browser }) => {
  const server = fakeServer();

  const contextA = await browser.newContext();
  await serve(contextA, server);
  const a = await contextA.newPage();
  await onboard(a);
  await a.goto("/herramientas/peso");
  await a.locator("#kg").fill("62");
  await a.getByRole("button", { name: /Guardar/ }).click();
  await reconnect(a);
  await expect
    .poll(() => [...server.rows.values()].filter((r) => r.store === "weightEntries").length)
    .toBe(1);

  // Delete it, sync, and confirm the tombstone — not the row — is what the
  // server holds. A hard delete would be undone by the very next pull.
  await a.getByRole("button", { name: /Borrar|Eliminar/ }).first().click();
  await reconnect(a);
  await expect
    .poll(
      () =>
        [...server.rows.values()].find((r) => r.store === "weightEntries")
          ?.deletedAt !== null,
    )
    .toBe(true);
  expect(
    [...server.rows.values()].find((r) => r.store === "weightEntries")?.payload,
  ).toBeNull();

  await contextA.close();
});

test("the app works with no account and no sync server at all", async ({
  page,
  context,
}) => {
  // The non-negotiable (BUILD-PLAN standing rule 3): with /api/v1/sync 404ing
  // — which is exactly what a deployment with no database does — nothing about
  // the app changes. This is the "seguir sin cuenta" path.
  await context.route("**/api/v1/sync**", (route) =>
    route.fulfill({ status: 404, body: "sync no disponible" }),
  );

  await onboard(page);
  await page.goto("/herramientas/peso");
  await page.locator("#kg").fill("60");
  await page.getByRole("button", { name: /Guardar/ }).click();
  await expect(page.getByText("60 kg").first()).toBeVisible();

  // Still there after a reload, with no error surfaced anywhere.
  await page.reload();
  await expect(page.getByText("60 kg").first()).toBeVisible();
});
