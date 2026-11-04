import { test, expect, type Page } from "@playwright/test";

// Night run item 1 — shared links land on public pages and are counted.
//
// The share text's link half depends on `NEXT_PUBLIC_APP_URL`, which local and
// CI builds do not set (see invite.spec.ts). The case every build can check is
// the text itself; with the variable set the spec also checks the link.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
const CODE = "ABCD234XYZ";

type Sent = { metric: string; key: string };

async function captureFunnel(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route("**/api/v1/stats/funnel", async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}") as Sent);
    await route.fulfill({ status: 204, body: "" });
  });
  return sent;
}

function authStatus(page: Page, signedIn: boolean) {
  return page.route("**/api/v1/auth-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        providers: ["google"],
        credentialsAvailable: true,
        signedIn,
        accountRequired: true,
        accountId: signedIn ? "acct-e2e" : null,
      }),
    }),
  );
}

test("a signed-out invitee sees what the invitation is, then signs in keeping the code", async ({
  page,
}) => {
  const sent = await captureFunnel(page);
  await authStatus(page, false);
  await page.goto(`/cuenta/invitacion?codigo=${CODE}&src=invita`);

  await expect(
    page.getByRole("heading", { name: "Te invitaron a acompañar un embarazo" }),
  ).toBeVisible();
  // A sample week from the public content, never hers.
  await expect(page.getByText("Es una semana de ejemplo, no la de ella.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver la semana 20 completa" })).toHaveAttribute(
    "href",
    "/semana/20",
  );

  const cta = page.getByRole("link", { name: "Entrar para aceptar" });
  await expect(cta).toBeVisible();
  const href = new URL((await cta.getAttribute("href"))!, "http://x");
  expect(href.pathname).toBe("/cuenta");
  expect(href.searchParams.get("returnTo")).toBe(`/?codigo=${CODE}`);

  // Counted once, as a share, never as a clinic QR.
  await expect.poll(() => sent.length).toBe(1);
  expect(sent).toEqual([{ metric: "shared", key: "invita" }]);

  // The sign-in screen keeps the destination through its own validation.
  await cta.click();
  await expect(page).toHaveURL(/\/cuenta\?ingreso=1/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(`/?codigo=${CODE}`);
});

test("a signed-in invitee goes straight to Familia with the code", async ({ page }) => {
  await authStatus(page, true);
  await page.goto(`/cuenta/invitacion?codigo=${CODE}`);
  await expect(page.getByRole("link", { name: "Aceptar la invitación" })).toHaveAttribute(
    "href",
    `/familia?codigo=${CODE}`,
  );
});

test("a link without a valid code says so instead of failing later", async ({ page }) => {
  await authStatus(page, false);
  await page.goto("/cuenta/invitacion?codigo=nope");
  await expect(page.getByRole("heading", { name: "Este enlace está incompleto" })).toBeVisible();
});

test("a week's share text names the week and links its public page", async ({ page }) => {
  await page.goto("/semana/20");
  await page.locator("summary", { hasText: "Tu pareja" }).click();
  const link = page.getByRole("link", { name: "Mandáselo por WhatsApp" }).first();
  const href = (await link.getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/?text=")).toBe(true);
  const text = decodeURIComponent(href.slice("https://wa.me/?text=".length));
  expect(text.startsWith("Semana 20 — ")).toBe(true);
  if (APP_URL) {
    expect(text.endsWith(`${APP_URL}/semana/20?src=semana`)).toBe(true);
  } else {
    expect(text).not.toContain("http");
  }
});
