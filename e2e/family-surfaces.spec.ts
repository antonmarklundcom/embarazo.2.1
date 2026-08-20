import { test, expect, type BrowserContext } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// K7 — "/familia is reachable in ≤2 taps from Hoy", and the three states of
// the card, and the signed-out guard.
//
// CI runs with no auth and no database, so a real owner view has to be stood
// up the way `companion.spec.ts` stands one up: an in-memory stub of
// `/api/v1/sharing`. What that leaves under test is the half that matters
// here — which surfaces render, for whom, and where the taps go.
//
// Matched by pathname rather than the `**/api/v1/sharing**` glob: Next names a
// build chunk after the route, and the glob intercepts that too (see
// e2e/revoked-companion.spec.ts, where it looked exactly like a cache leak).

type Role = "owner" | "partner" | "family";

async function serveOwner(
  context: BrowserContext,
  members: { userId: string; role: Role }[] | null,
) {
  await context.route(
    (url) => url.pathname === "/api/v1/sharing",
    async (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      return route.fulfill({
        status: members === null ? 401 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          members === null
            ? { error: "sesión requerida" }
            : {
                views: [
                  {
                    pregnancyId: "preg-1",
                    role: "owner",
                    snapshot: null,
                    members: [
                      { userId: "me", role: "owner", createdAt: "", accompanyingAt: null },
                      ...members.map((m) => ({ ...m, createdAt: "", accompanyingAt: null })),
                    ],
                    cheers: [],
                    tasks: [],
                  },
                ],
              },
        ),
      });
    },
  );
}

/** The signed-out answer: no session, so no views. */
async function serveSignedOut(context: BrowserContext) {
  await serveOwner(context, null);
  await context.route(
    (url) => url.pathname === "/api/v1/auth-status",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ providers: [], signedIn: false }),
      }),
  );
}

test("an owner with nobody invited gets the empty card, and it invites", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await serveOwner(context, []);
  const page = await context.newPage();
  await completeOnboarding(page);

  const card = page.getByRole("region", { name: "Tu familia" });
  await expect(card).toBeVisible();
  // The empty state answers the question the emptiness raises, rather than
  // reporting that nothing is there.
  await expect(card).toContainText("Compartí tu embarazo");

  // One tap. That is the whole K7 "done when".
  await card.getByRole("link", { name: "Invitá" }).click();
  await expect(page).toHaveURL(/\/familia$/);

  await context.close();
});

test("the card counts one companion, and n companions, by role", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await serveOwner(context, [{ userId: "a", role: "partner" }]);
  const page = await context.newPage();
  await completeOnboarding(page);

  const card = page.getByRole("region", { name: "Tu familia" });
  await expect(card).toContainText("Una persona sigue tu embarazo");
  await expect(card).toContainText("Tu pareja");
  // E1 shares no names between members, so there is none to render.
  await expect(card).not.toContainText("@");

  await context.close();
});

test("three companions read as three", async ({ browser }) => {
  const context = await browser.newContext();
  await serveOwner(context, [
    { userId: "a", role: "partner" },
    { userId: "b", role: "family" },
    { userId: "c", role: "family" },
  ]);
  const page = await context.newPage();
  await completeOnboarding(page);

  await expect(page.getByRole("region", { name: "Tu familia" })).toContainText(
    "3 personas siguen tu embarazo",
  );

  await context.close();
});

test("a signed-out local-only user sees no family card, and /familia asks for an account", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await serveSignedOut(context);
  const page = await context.newPage();
  await completeOnboarding(page);

  // No card: there is no family to have without an account, and rendering an
  // invite this user cannot complete is the bug §7 flags.
  await expect(page.getByRole("region", { name: "Tu familia" })).toHaveCount(0);

  // K7's "done when" says this user sees the invite-a-friend card instead.
  // <InviteFriend> is already mounted on this screen and self-gates on
  // NEXT_PUBLIC_APP_URL, which CI deliberately leaves unset (an invitation to
  // nowhere is worse than no button — E3). So the honest assertion here is
  // the one that holds in this environment: the family card is gone and
  // nothing has replaced it with a control that would fail. The configured
  // case is covered by E3's own spec.
  await expect(page.getByRole("button", { name: /Invitar/i })).toHaveCount(0);

  // And the page itself explains rather than offering buttons that 401.
  await page.goto("/familia");
  await expect(page.getByText("Para esto necesitás una cuenta")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mi pareja" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Familia o amiga" })).toHaveCount(0);

  await context.close();
});

test("the próximo control is edited on the home screen, not in ajustes", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await serveOwner(context, []);
  const page = await context.newPage();
  await completeOnboarding(page);

  const card = page.getByRole("region", { name: "Próximo control" });
  await expect(card).toContainText("Todavía no anotaste ninguno");

  await card.getByRole("button", { name: "Anotar" }).click();
  const inThreeDays = new Date(Date.now() + 3 * 86400000)
    .toISOString()
    .slice(0, 10);
  await card.getByLabel("Fecha del control").fill(inThreeDays);
  await card.getByLabel("Hora (opcional)").fill("09:00");
  await card.getByRole("button", { name: "Guardar" }).click();

  // Days-to-go is the answer to the question she is actually asking.
  await expect(card).toContainText("En 3 días");
  await expect(card).toContainText("09:00");

  // And it survives a reload, i.e. it was written to Dexie rather than state.
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Próximo control" }),
  ).toContainText("En 3 días");

  await context.close();
});

test("the roadmap no longer promises a feature that shipped", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await serveOwner(context, []);
  const page = await context.newPage();
  await completeOnboarding(page);

  // It shipped in E1. A "próximamente" badge on a working feature is how a
  // user decides to stop looking for it.
  await expect(page.getByText("Compartir con tu pareja")).toHaveCount(0);
  await expect(page.getByText("Comunidad de mamás")).toHaveCount(0);

  await context.close();
});
