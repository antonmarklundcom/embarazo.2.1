import { test, expect, type BrowserContext } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K4 — opt-in photo backup.
//
// CI has no bucket, no MySQL and no OAuth, so there are two halves here:
//
//   * **The unconfigured half runs for real.** That is the configuration
//     ARCHITECTURE.md protects, and it is the one that must never break the
//     photo diary: `/api/v1/photos` 404s, the settings card is absent, and
//     adding and deleting a photo works exactly as it did before K4.
//   * **The configured half is driven against a stubbed `/api/v1/photos` and a
//     stubbed bucket**, the way A3 stubbed the sync wire and K2 the sharing
//     one. What that leaves under test is the real client pipeline: what it
//     asks for, in what order, that the bytes go straight to the bucket rather
//     than through our server, and that opting out deletes.

interface StoredPhoto {
  store: string;
  recordId: string;
  contentType: string;
  bytes: number;
  payload: unknown;
  deletedAt: number | null;
}

function fakePhotoServer() {
  return {
    photos: [] as StoredPhoto[],
    /** Object keys the browser PUT to, in order. */
    puts: [] as string[],
    posts: [] as Record<string, unknown>[],
    deletedAll: 0,
  };
}

const BUCKET = "https://bucket.example.test";

async function serve(
  context: BrowserContext,
  server: ReturnType<typeof fakePhotoServer>,
) {
  // The stand-in bucket. A presigned PUT goes straight here — never through
  // /api/v1/photos — which is the property the ordering assertions rely on.
  await context.route(`${BUCKET}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      server.puts.push(new URL(request.url()).pathname);
      return route.fulfill({ status: 200, body: "" });
    }
    if (request.method() === "GET") {
      // A 1x1 PNG, so a restore produces a real Blob.
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64",
        ),
      });
    }
    return route.fulfill({ status: 204, body: "" });
  });

  await context.route("**/api/v1/photos**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          photos: server.photos.map((photo) => ({
            ...photo,
            updatedAt: 1,
            serverUpdatedAt: 1,
            downloadUrl: photo.deletedAt
              ? null
              : `${BUCKET}/mibebe/fotos/u1/${photo.store}/${photo.recordId}`,
          })),
          serverTime: Date.now(),
        }),
      });
    }

    const body = request.postDataJSON() as Record<string, unknown>;
    server.posts.push(body);

    if (body.action === "upload-url") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: `${BUCKET}/mibebe/fotos/u1/${body.store}/${body.recordId}?X-Amz-Signature=stub`,
          contentType: body.contentType,
        }),
      });
    }

    if (body.action === "confirm") {
      server.photos.push({
        store: body.store as string,
        recordId: body.recordId as string,
        contentType: body.contentType as string,
        bytes: body.bytes as number,
        payload: body.payload,
        deletedAt: null,
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }

    if (body.action === "delete") {
      const photo = server.photos.find(
        (p) => p.recordId === body.recordId && p.store === body.store,
      );
      if (photo) {
        photo.deletedAt = Date.now();
        photo.payload = null;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }

    // delete-all
    server.deletedAll += 1;
    server.photos = [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, deleted: 0 }),
    });
  });
}

/** Add a bump photo through the real UI. */
async function addBumpPhoto(page: import("@playwright/test").Page) {
  await page.goto("/herramientas/fotos");
  await page.setInputFiles('input[type="file"]', {
    name: "panza.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  // Downscaling is async: wait for the thumbnail rather than racing the next
  // navigation, or the photo is still in flight when the test leaves the page.
  await expect(page.locator("img").first()).toBeVisible();
}

// ---------------------------------------------------------------------------
// Unconfigured — the configuration this build actually ships in
// ---------------------------------------------------------------------------

test("with no bucket configured the route does not exist", async ({ request }) => {
  // Same rule as /api/auth/* without AUTH_SECRET: a build with no credentials
  // is a supported configuration, not a broken one, and it says so with a 404
  // rather than a stack trace.
  const res = await request.get("/api/v1/photos");
  expect(res.status()).toBe(404);
});

test("the opt-in is absent when it could not work, and the diary still works", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");
  // An opt-in for something that cannot happen is a broken switch, not a
  // choice.
  await expect(page.getByText("Copia de tus fotos")).toHaveCount(0);

  await addBumpPhoto(page);

  // And nothing about K4 sent a photo anywhere.
  const leaked: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "PUT") leaked.push(req.url());
  });
  await page.reload();
  await expect(page.locator("img").first()).toBeVisible();
  expect(leaked).toEqual([]);
});

// ---------------------------------------------------------------------------
// Configured — driven against a stubbed route and bucket
// ---------------------------------------------------------------------------

test("turning it on uploads the photos already on the phone", async ({
  browser,
}) => {
  const server = fakePhotoServer();
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await addBumpPhoto(page);

  await page.goto("/ajustes");
  await page
    .getByRole("switch", { name: "Guardar mis fotos en mi cuenta" })
    .click();

  await expect.poll(() => server.photos.length).toBe(1);

  // The bytes went straight to the bucket, not through our server.
  expect(server.puts).toHaveLength(1);
  expect(server.puts[0]).toContain("/fotos/u1/photoEntries/");

  // Ask, PUT, confirm — in that order.
  const actions = server.posts.map((p) => p.action);
  expect(actions.indexOf("upload-url")).toBeLessThan(actions.indexOf("confirm"));

  // The photo's own metadata travelled as an opaque payload, not as columns.
  const confirm = server.posts.find((p) => p.action === "confirm")!;
  expect(confirm.store).toBe("photoEntries");
  // downscaleImage re-encodes every photo as JPEG before it is stored, so
  // that is what the pipeline sees and what gets signed.
  expect(confirm.contentType).toBe("image/jpeg");
  expect(Object.keys(confirm.payload as object).sort()).toEqual([
    "createdAt",
    "week",
  ]);

  await context.close();
});

test("a second device gets the photos back after signing in", async ({
  browser,
}) => {
  const server = fakePhotoServer();
  server.photos.push({
    store: "photoEntries",
    recordId: "remote-1",
    contentType: "image/png",
    bytes: 70,
    payload: { week: 24, createdAt: Date.now() },
    deletedAt: null,
  });

  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await page.goto("/herramientas/fotos");
  // Nothing on this phone yet.
  await expect(page.locator("img")).toHaveCount(0);

  await page.goto("/ajustes");
  await page
    .getByRole("switch", { name: "Guardar mis fotos en mi cuenta" })
    .click();

  // Wait for the card to report the run finished rather than sleeping: the
  // toggle stores the preference and then does the whole upload/restore pass.
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/herramientas/fotos");
  await expect(page.locator("img").first()).toBeVisible();
  // Restored under the week it was taken in, not under "0".
  await expect(
    page.getByRole("button", { name: "Ver foto de la semana 24" }),
  ).toBeVisible();

  await context.close();
});

test("turning it off deletes the server copies and stops uploading", async ({
  browser,
}) => {
  const server = fakePhotoServer();
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await addBumpPhoto(page);
  await page.goto("/ajustes");

  const toggle = page.getByRole("switch", {
    name: "Guardar mis fotos en mi cuenta",
  });
  await toggle.click();
  await expect.poll(() => server.photos.length).toBe(1);

  await toggle.click();
  await expect(page.getByText("Apagado. Borramos las copias del servidor.")).toBeVisible();
  expect(server.deletedAll).toBe(1);
  expect(server.photos).toEqual([]);

  // A new photo now goes nowhere.
  const putsBefore = server.puts.length;
  await addBumpPhoto(page);
  // Give the fire-and-forget upload every chance to happen, so the assertion
  // that it did not is worth something.
  await page.waitForTimeout(1000);
  expect(server.puts.length).toBe(putsBefore);

  // And the photo is still on the phone: opting out of backup is not deleting
  // her photos.
  await expect(page.locator("img").first()).toBeVisible();

  await context.close();
});

test("deleting a photo tells the server before the row is gone", async ({
  browser,
}) => {
  const server = fakePhotoServer();
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await addBumpPhoto(page);
  await page.goto("/ajustes");
  await page
    .getByRole("switch", { name: "Guardar mis fotos en mi cuenta" })
    .click();
  await expect.poll(() => server.photos.length).toBe(1);
  const recordId = server.photos[0]!.recordId;

  await page.goto("/herramientas/fotos");
  await page.getByRole("button", { name: /^Ver foto de la semana/ }).click();
  await page.getByRole("button", { name: /Borrar/ }).click();

  await expect
    .poll(() => server.posts.find((p) => p.action === "delete"))
    .toEqual({ action: "delete", store: "photoEntries", recordId });

  // The tombstone stays so a second device learns it is gone; the metadata
  // does not.
  await expect.poll(() => server.photos[0]?.deletedAt).not.toBeNull();
  expect(server.photos[0]!.payload).toBeNull();

  await context.close();
});
