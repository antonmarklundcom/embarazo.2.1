import { test, expect } from "@playwright/test";
import { onboardEmbarazada } from "./helpers";

// Verifies the core offline promise: once the service worker is controlling,
// a week page is served from the cache with the network fully off. We reload
// a page the SW already holds rather than a brand-new route, because
// hard-navigating to an unvisited precached route offline is timing-sensitive
// and flaky in CI; reloading still exercises the SW cache-serving path, which
// is the behavior users depend on.
test("a week page is served by the service worker while offline", async ({
  page,
  context,
}) => {
  await onboardEmbarazada(page);

  await page.goto("/semana/10");
  await expect(page).toHaveTitle(/Semana 10/);

  // Wait until the SW is actually controlling this client.
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, undefined, {
    timeout: 30_000,
  });

  // Reload once online now that the SW controls the page, so the document
  // response is stored in the nido-pages runtime cache (the first load
  // happened before the SW took control and wasn't cached).
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Semana 10/);

  // Now offline, the SW must serve the cached page — not the /offline fallback.
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Semana 10/);
  await expect(page.getByText(/Tu bebé es del tamaño de/)).toBeVisible();

  await context.setOffline(false);
});
