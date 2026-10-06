import type { BrowserContext } from "@playwright/test";

// F01 — every path that sends this phone's data (photos, the companion
// snapshot, push schedules) first asks which account the session is, with the
// same identity probe ordinary sync uses (GET /api/v1/sync past every cursor).
// CI has no database, so that route 404s ("no session") unless a spec standing
// up a signed-in user also stands up the probe. A real signed-in deployment
// always has it.
//
// Installed on the CONTEXT for the same reason as `serveClientFlags`: the
// service worker's fetches only go through context routes.
export async function serveIdentity(
  context: BrowserContext,
  account: string | { current: string } = "u1",
): Promise<void> {
  const id = () => (typeof account === "string" ? account : account.current);
  await context.route("**/api/v1/sync**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as {
        records: { store: string; recordId: string }[];
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: body.records.map((r) => ({
            store: r.store,
            recordId: r.recordId,
            outcome: "accepted",
          })),
          serverTime: Date.now(),
          accountId: id(),
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ records: [], serverTime: Date.now(), accountId: id() }),
    });
  });
}
