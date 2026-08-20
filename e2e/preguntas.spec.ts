import { test, expect, type BrowserContext } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// K20 — "submit → admin queue → approve → visible in /preguntas; rejected and
// pending questions never render publicly; the submitter sees her status."
//
// CI has no MySQL and no OAuth, so the two endpoints are served here, the way
// `sync.spec.ts` stands up a fake sync server. What that leaves genuinely under
// test is the half that cannot be unit-tested: what a woman's screen shows.
// The server's own "approved only" guarantee is covered where it lives —
// `lib/invariants/publicQuestions.test.ts` asserts the query filters in SQL and
// that the public projection cannot even name the asker.
//
// The fixture is chosen to be adversarial: the *same* pending and rejected
// questions that appear in her own status list are also offered to the page, so
// a component that rendered "everything it was given" would fail here.

const PUBLISHED = {
  questions: [
    {
      id: "q-approved",
      question: "¿Puedo tomar tereré en el embarazo?",
      answer: "Sí, con moderación, y cuidando el agua.",
      answeredAt: "2026-08-14",
    },
  ],
};

const MINE = {
  questions: [
    {
      id: "q-pending",
      question: "MI-PREGUNTA-PENDIENTE sobre las náuseas de la mañana",
      status: "pending",
      answer: null,
      createdAt: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "q-rejected",
      question: "MI-PREGUNTA-RECHAZADA sobre un dolor puntual",
      status: "rejected",
      answer: null,
      createdAt: "2026-08-18T10:00:00.000Z",
    },
  ],
};

/**
 * Install the fixtures.
 *
 * Always called AFTER `completeOnboarding`: the onboarding flow reads
 * `/api/v1/auth-status` too, and a stub saying "signed in" takes it down the
 * branch that has no "Seguir sin cuenta" button — which is not the flow CI can
 * complete (no OAuth configured).
 */
async function serveQuestions(
  context: BrowserContext,
  options: { signedIn: boolean; mine?: typeof MINE },
) {
  await context.route(
    (url) => url.pathname === "/api/v1/auth-status",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ providers: [], signedIn: options.signedIn }),
      }),
  );
  await context.route(
    (url) => url.pathname === "/api/v1/preguntas",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PUBLISHED),
      }),
  );
  await context.route(
    (url) => url.pathname === "/api/v1/mis-preguntas",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options.mine ?? { questions: [] }),
      }),
  );
}

test("an approved answer is published, and nothing else is", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await completeOnboarding(page);
  await serveQuestions(context, { signedIn: true, mine: MINE });

  await page.goto("/preguntas");

  // The approved Q&A is on the page, question and answer together.
  await expect(
    page.getByText("¿Puedo tomar tereré en el embarazo?"),
  ).toBeVisible();
  await expect(
    page.getByText("Sí, con moderación, y cuidando el agua."),
  ).toBeVisible();

  // Her own pending and rejected questions appear ONCE each — in her status
  // list — and never as published Q&A. The count is the assertion: a component
  // that rendered its inputs indiscriminately would show them twice.
  await expect(page.getByText(/MI-PREGUNTA-PENDIENTE/)).toHaveCount(1);
  await expect(page.getByText(/MI-PREGUNTA-RECHAZADA/)).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Tus preguntas" }),
  ).toBeVisible();

  // And she is told what state each is in, including the unwelcome one — as a
  // badge AND as a sentence explaining it, which is why "No la publicamos"
  // legitimately appears twice.
  await expect(page.getByText("En revisión")).toBeVisible();
  await expect(page.getByText("No la publicamos", { exact: true })).toBeVisible();
  await expect(page.getByText(/No la publicamos: puede ser algo muy personal/)).toBeVisible();

  await context.close();
});

test("the static FAQ is still the top of the page", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await completeOnboarding(page);
  await serveQuestions(context, { signedIn: true });
  await page.goto("/preguntas");

  // K20 added a living section; it did not replace the answers people came for.
  // Those are in git and precached, which is why they load before any fetch.
  await expect(page.getByRole("heading", { name: "Privacidad" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Preguntas de otras mamás" }),
  ).toBeVisible();

  await context.close();
});

test("a signed-out visitor gets the reason, not a form that would fail", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await completeOnboarding(page);
  await serveQuestions(context, { signedIn: false });
  await page.goto("/preguntas");

  // Asking needs an account — so she can be shown the answer when it lands.
  // Saying so beats a textarea that 401s after she has typed her question.
  await expect(page.getByRole("link", { name: "Crear una cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar pregunta" })).toHaveCount(0);

  // Reading is not gated: the published answers are for everyone.
  await expect(
    page.getByText("¿Puedo tomar tereré en el embarazo?"),
  ).toBeVisible();

  await context.close();
});

test("the published Q&A survives going offline", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await completeOnboarding(page);
  await serveQuestions(context, { signedIn: true });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.goto("/preguntas");
  await expect(
    page.getByText("¿Puedo tomar tereré en el embarazo?"),
  ).toBeVisible();

  // The page itself is static and precached; the answers come from a route the
  // service worker caches network-first (K20 added it beside /directory). Her
  // own status list is deliberately NOT cached — a stale "en revisión" from
  // last Tuesday is a worse answer than none — so nothing here asserts it.
  await context.setOffline(true);
  await page.goto("/preguntas");
  await expect(
    page.getByRole("heading", { name: "Preguntas de otras mamás" }),
  ).toBeVisible();

  await context.close();
});
