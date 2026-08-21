import { test, expect } from "@playwright/test";

// BUILD-PLAN A7: "a non-admin hitting any /admin URL gets a 404 (not a 403 —
// do not confirm the route exists)".
//
// CI runs with no database and no OAuth, which is exactly the state a stranger
// or a signed-out visitor is in, and the one an attacker probing the domain
// would hit. The guard has to hold there before it can hold anywhere.

const ADMIN_URLS = [
  "/admin",
  "/admin/usuarios/anyone",
  "/admin/usuarios/../../etc",
  // K16 — the metrics page is behind the same guard as everything else, and it
  // is worth naming here rather than trusting the layout: this is the page that
  // would tell a stranger how many users the app has.
  "/admin/metricas",
  // K15 — sponsor click counts. Not health data, but it is the page that tells
  // a competitor what a sponsor is paying for.
  "/admin/patrocinios",
  // D4 — the review-debt page. It names every seed file and how much of the
  // app is dark, which is a map of what is worth probing.
  "/admin/contenido",
];

test("every /admin URL 404s for someone who is not an administrator", async ({
  page,
}) => {
  for (const url of ADMIN_URLS) {
    const response = await page.goto(url);
    expect(response?.status(), `${url} must return 404`).toBe(404);

    // Not a 403 and not a redirect to a sign-in screen: both of those tell a
    // stranger there is something here worth attacking. What they get is the
    // app's ordinary "no encontramos esa página", down to the <title>.
    await expect(page).toHaveTitle(/Mi Bebé/);
    expect(await page.title()).not.toContain("Panel");
    const body = await page.content();
    expect(body).toContain("No encontramos esa página");
    expect(body).not.toContain("Buscar una cuenta");
    expect(body.toLowerCase()).not.toContain("prohibido");
  }
});

test("the admin panel is not linked or advertised anywhere in the app", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);

  await page.goto("/ajustes");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});

test("robots.txt disallows /admin and the sitemap omits it", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("/admin");

  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/admin");
});
