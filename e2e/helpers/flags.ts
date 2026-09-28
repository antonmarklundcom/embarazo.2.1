import type { BrowserContext } from "@playwright/test";

// CI has no database, so `/api/v1/flags` answers the defaults (all off). A
// spec that tests a flagged surface serves its own answer.
//
// On the CONTEXT, not the page: `/api/v1/flags` goes through the service
// worker (NetworkFirst, `app/sw.ts`), and only a context route sees requests
// the worker makes — a page route would be bypassed once it controls the page.
export async function serveClientFlags(
  context: BrowserContext,
  flags: Record<string, boolean>,
): Promise<void> {
  await context.route("**/api/v1/flags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recomendados: false, guarani: false, ...flags }),
    }),
  );
}
