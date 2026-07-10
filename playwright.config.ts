import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests (build plan P1.7). Run against the PRODUCTION build
// (`next start`) so the service worker and precache behave like real life.
//
// Browser resolution: some environments ship a pre-installed Chromium (path
// below or PW_CHROMIUM_PATH). If that binary exists, point at it to avoid a
// download; otherwise fall back to Playwright's own bundled browser (the
// normal CI path after `npx playwright install chromium`).
const PRESET_CHROMIUM =
  process.env.PW_CHROMIUM_PATH ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
