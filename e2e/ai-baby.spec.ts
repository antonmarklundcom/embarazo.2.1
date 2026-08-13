import { test, expect } from "@playwright/test";

// BUILD-PLAN F2: "the feature can be switched off with one env var".
//
// The unit tests prove the quota arithmetic and the route's 404. This proves
// the thing a user could actually be exposed to: with `AI_BABY_ENABLED` unset —
// which is how this build, CI and production all run today — the screen offers
// nothing that could send a photo or spend a peso. No file input, no consent
// box, no generate button.

test.describe("the AI baby screen with the feature switched off", () => {
  test("says so, and offers no way to upload a photo", async ({ page }) => {
    await page.goto("/herramientas/bebe-ia");

    await expect(
      page.getByText("Esta función no está disponible ahora mismo."),
    ).toBeVisible();

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Generar la imagen/ }),
    ).toHaveCount(0);
  });

  test("the API does not exist either", async ({ request }) => {
    // Not a 403 and not a "próximamente": there is nothing here to probe.
    expect((await request.get("/api/v1/ai/baby")).status()).toBe(404);
    expect(
      (
        await request.post("/api/v1/ai/baby", {
          data: { consent: "acepto", photos: [] },
        })
      ).status(),
    ).toBe(404);
  });
});
