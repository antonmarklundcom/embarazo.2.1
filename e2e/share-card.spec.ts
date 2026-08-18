import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN E2 (feature map #30). Chromium's headless build does not offer
// `navigator.share`, which is the *fallback* path and therefore the one worth
// testing: the image must still be produced and handed over as a download,
// with no request leaving the page.

test("sharing the week card produces a PNG without touching the network", async ({
  page,
}) => {
  // Anything that could carry an image out of the page: a POST/PUT, or a
  // request whose body is not empty. GETs for placements and the directory are
  // the home screen doing its normal work and are not what this guards.
  const uploads: string[] = [];
  page.on("request", (request) => {
    const method = request.method();
    if (method !== "GET" && method !== "HEAD") {
      uploads.push(`${method} ${request.url()}`);
    }
  });

  await completeOnboarding(page, { daysAgo: 140 });

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir mi semana" }).click();

  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^mi-bebe-semana-\d+\.png$/);

  // The card is drawn from a canvas in the page: nothing was posted anywhere,
  // which is the property that matters for a feature whose other half
  // composites somebody's bump photo.
  expect(uploads, uploads.join("\n")).toEqual([]);
});

test("the copy tells the truth about where the image is made", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 140 });

  await expect(page.getByText(/se arma en tu teléfono y solo lleva la semana/)).toBeVisible();
});
