import { test, expect } from "@playwright/test";

import { gotoPrecached, waitForPrecache } from "./helpers/offline";
import { completeOnboarding } from "./helpers/onboarding";

// P1.7 (BUILD-PLAN.md): offline navigation to a precached week page. All 42
// /semana/[n] pages are statically generated and land in the Serwist
// precache manifest (app/sw.ts), independent of onboarding/profile state.
test("navigates to a precached week page while offline", async ({ page, context }) => {
  // Settle normal onboarding before cutting the network; a pending home
  // onboarding navigation must not race this public weekly-page check.
  // Account-specific offline ownership is covered by account-entry.spec.ts.
  await completeOnboarding(page, { daysAgo: 98 });
  // Wait for the worker to control this page AND for the entry to exist
  // before going offline — `serviceWorker.ready` alone proves neither, and
  // both are what this navigation depends on (see helpers/offline.ts).
  // Wait for every format/width the browser may select, not only the document.
  await waitForPrecache(page, [
    "/semana/15",
    "/assets/img/bebe-realista-semana-15-640.avif",
    "/assets/img/bebe-realista-semana-15-1280.avif",
    "/assets/img/bebe-realista-semana-15-640.webp",
    "/assets/img/bebe-realista-semana-15-1280.webp",
  ]);

  await context.setOffline(true);
  await gotoPrecached(page, "/semana/15");

  await expect(page.getByRole("heading", { name: "Para hacer esta semana" })).toBeVisible();
  const baby = page.locator('figure img[data-canonical-src^="/assets/semanas/bebe-15.webp"]');
  await expect(baby).toBeVisible();
  await expect.poll(() => baby.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => baby.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(
    /\/assets\/img\/bebe-realista-semana-15-(?:640|1280)\.(?:avif|webp)(?:\?.*)?$/,
  );
});

// docs/IMPROVEMENTS-2026-10-17.md #10: the síntomas, diario, fotos, peso and
// checklist pages joined the cold-install precache (`pageRoutes` in app/sw.ts)
// because the README promises them offline. Nothing exercised that promise.
//
// "Verified owner": offline, the account gate admits only a device whose own
// records belong to an account that was verified online
// (`verifiedOfflineAccountId`). The test signs in as an owner while online (the
// gate writes the verified marker), then cuts the network, and each page must
// render its own H1 — not the `/offline` fallback and not another screen.
const OFFLINE_TOOLS: { path: string; h1: RegExp }[] = [
  { path: "/herramientas/sintomas", h1: /^¿Cómo te sentís hoy\?$/ },
  { path: "/herramientas/diario", h1: /^Diario$/ },
  { path: "/herramientas/fotos", h1: /^Diario de fotos$/ },
  { path: "/herramientas/peso", h1: /^Peso$/ },
  { path: "/herramientas/checklist", h1: /^Checklists$/ },
];

test("the precached tool pages open offline for a verified owner", async ({ page, context }) => {
  test.setTimeout(120_000);
  await completeOnboarding(page, { daysAgo: 70 });

  // Online as the account that owns this phone's records: the gate binds the
  // device to it and remembers the verification.
  await context.route("**/api/v1/auth-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        providers: ["google"],
        credentialsAvailable: false,
        accountRequired: true,
        signedIn: true,
        accountId: "offline-owner",
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mibebe.auth.offline.v1"))).not.toBeNull();

  await waitForPrecache(page, OFFLINE_TOOLS.map((tool) => tool.path));

  await context.route("**/api/v1/auth-status", (route) => route.abort());
  await context.setOffline(true);

  for (const { path, h1 } of OFFLINE_TOOLS) {
    // Offline, the previous tool's link prefetches fail and Next falls back to
    // browser navigations, which can race the next page.goto and win. A blank
    // page between visits leaves nothing in flight (the SW still answers the
    // navigation from the precache).
    await page.goto("about:blank");
    await gotoPrecached(page, path);
    await expect(page.locator("main h1").first(), `${path} renders its own heading offline`).toHaveText(h1);
    await expect(page.getByText("Sin internet: estás viendo los registros guardados de tu cuenta.")).toBeVisible();
  }
});
