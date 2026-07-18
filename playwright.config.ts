import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// P1.7 (BUILD-PLAN.md): E2E smoke tests against a production build, since
// the service worker (offline test) is disabled in `next dev`
// (next.config.ts). CI/local flow: `npm run build && npm run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The dev container ships a pre-installed Chromium pinned to a
        // different revision than this @playwright/test version expects
        // (browser downloads are disabled there). Point at it explicitly
        // when present; falls back to Playwright's own resolution
        // (e.g. a normal CI runner with `npx playwright install`) otherwise.
        launchOptions: existsSync("/opt/pw-browsers/chromium")
          ? { executablePath: "/opt/pw-browsers/chromium" }
          : undefined,
      },
    },
  ],
  webServer: {
    // Assumes `npm run build` already ran (see package.json test:e2e).
    command: "npm run start -- -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
