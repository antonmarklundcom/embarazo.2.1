import { test, expect, type BrowserContext } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K2 — the companion experience.
//
// CI has no MySQL and no OAuth, so the sharing server is stood up here the way
// A3 stood up the sync wire: a small in-memory implementation of the
// `/api/v1/sharing` contract, shared with the page through `context.route`.
// What that leaves under test is the half that cannot be unit-tested — the real
// components, the real role rules, the real request bodies — driven by a real
// browser.
//
// The server's own authorisation is not what these tests assert (a stub cannot
// prove a membership check); that lives in `lib/sharing/routeContract.test.ts`
// and `lib/server/account.test.ts`. What these prove is that the client asks
// for the right thing, sends only ids, and shows each role exactly what it is
// entitled to.

interface View {
  pregnancyId: string;
  role: "owner" | "partner" | "family";
  snapshot: {
    week: number | null;
    dueDate: number | null;
    nextAppointmentAt: number | null;
    babyName: string | null;
    updatedAt: number;
  } | null;
  tasks?: { itemKey: string; doneAt: number | null; updatedAt: number }[];
  cheers?: { cheerId: string; createdAt: number; seenAt: number | null }[];
}

const NOW = Date.now();

function snapshot(week: number) {
  return {
    week,
    dueDate: NOW + 100 * 86400000,
    nextAppointmentAt: NOW + 5 * 86400000,
    babyName: "Silvia",
    updatedAt: NOW,
  };
}

function fakeSharing(initial: View[]) {
  return {
    views: initial,
    posts: [] as Record<string, unknown>[],
  };
}

async function serve(
  context: BrowserContext,
  server: ReturnType<typeof fakeSharing>,
) {
  await context.route("**/api/v1/sharing**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      server.posts.push(body);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ views: server.views }),
    });
  });
}

test("a pareja who accepted an invite gets a real home screen", async ({
  browser,
}) => {
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "partner",
      snapshot: snapshot(24),
      tasks: [{ itemKey: "bolso-carne", doneAt: null, updatedAt: NOW }],
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/");

  // The week comes from her device; the words come from his own bundle.
  await expect(page.getByRole("heading", { name: "Semana 24" })).toBeVisible();
  await expect(page.getByText("Silvia")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Esta semana, para vos" }),
  ).toContainText("pataditas");

  // The list she asked him to take care of, rendered from the local seed —
  // the wire carried only "bolso-carne".
  await expect(page.getByText("Carné perinatal con tus controles")).toBeVisible();
  await page
    .getByRole("button", { name: /Carné perinatal con tus controles/ })
    .click();

  await expect
    .poll(() => server.posts.filter((p) => p.action === "complete-task").length)
    .toBe(1);
  expect(server.posts.find((p) => p.action === "complete-task")).toEqual({
    action: "complete-task",
    pregnancyId: "preg-1",
    itemKey: "bolso-carne",
    done: true,
  });

  await context.close();
});

test("mandale ánimo sends an id and nothing a person wrote", async ({
  browser,
}) => {
  const server = fakeSharing([
    { pregnancyId: "preg-1", role: "partner", snapshot: snapshot(24), tasks: [] },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/");

  const cheers = page.getByRole("region", { name: "Mandale ánimo" });
  await expect(cheers).toBeVisible();
  // There is no text input in this feature, on purpose: a free-text channel
  // into a pregnant user's home screen is a moderation surface.
  await expect(cheers.locator("input, textarea")).toHaveCount(0);

  await page.getByRole("button", { name: "Mandar ánimo: ¡Fuerza!" }).click();
  await expect(page.getByText("Listo, se lo mandamos.")).toBeVisible();

  const sent = server.posts.find((p) => p.action === "cheer");
  expect(sent).toEqual({
    action: "cheer",
    pregnancyId: "preg-1",
    cheerId: "fuerza",
  });

  await context.close();
});

test("familia sees the week and the content, but never the checklist", async ({
  browser,
}) => {
  // The server does not send `tasks` to a family member at all — this asserts
  // the client half: nothing on their screen goes looking for a list.
  const server = fakeSharing([
    { pregnancyId: "preg-1", role: "family", snapshot: snapshot(24) },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Familiar o amiga", landsOnHome: false });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Semana 24" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Esta semana, para vos" }),
  ).toContainText("regalar");
  // Ánimo is for everyone who is close; the checklist is not.
  await expect(page.getByRole("region", { name: "Mandale ánimo" })).toBeVisible();
  await expect(page.getByText("Tu lista")).toHaveCount(0);

  await context.close();
});

test("the mamá sees the ánimos, grouped, and acknowledges them once", async ({
  browser,
}) => {
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "owner",
      snapshot: snapshot(24),
      cheers: [
        { cheerId: "te-quiero", createdAt: NOW, seenAt: null },
        { cheerId: "te-quiero", createdAt: NOW - 1000, seenAt: null },
        { cheerId: "fuerza", createdAt: NOW - 90_000_000, seenAt: null },
      ],
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);

  const card = page.getByRole("region", { name: "Ánimos de tu familia" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Te quiero");
  await expect(card).toContainText("×2");
  // Guaraní rides along where the phrase is really said in Guaraní.
  await expect(card).toContainText("Rohayhu");

  // Acknowledged once per visit, not once per render.
  await expect
    .poll(() => server.posts.filter((p) => p.action === "cheers-seen").length)
    .toBe(1);

  await context.close();
});

test("revoking access cuts the companion screen off on the next load", async ({
  browser,
}) => {
  const server = fakeSharing([
    { pregnancyId: "preg-1", role: "partner", snapshot: snapshot(24), tasks: [] },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/");
  await expect(page.getByText("Estás acompañando")).toBeVisible();

  // She revoked him. Nothing is cached on his phone, so there is nothing to go
  // stale — the next load simply has no membership to render.
  server.views = [];
  await page.reload();

  await expect(page.getByText("Estás acompañando")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Mandale ánimo" })).toHaveCount(0);
  // Not a dead end: he lands on the ordinary app he onboarded into.
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  await context.close();
});
