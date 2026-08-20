import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K1 (docs/FABLE-PLAN-2026-08.md §3) — account-first onboarding.
//
// The flow is mode → role → fecha → **tu situación** → departamento →
// **cuenta** → nombre del bebé → invitación, with a second, shorter path for
// somebody arriving on an invitation: mode → role → cuenta → **código** (K9-F5). Each test gets a fresh browser context (isolated
// IndexedDB/localStorage), so no cleanup is needed between runs.
//
// CI has no AUTH_SECRET, no Google client and no database, so the account step
// renders its "por ahora, sin cuenta" face here. That is the *local-only* path
// (ARCHITECTURE.md §4.2) and it is half of what K1's "Done when" asks for; the
// other half — that the answers survive leaving the flow and coming back, which
// is what an OAuth redirect does to it — is exercised below without needing a
// real provider, because the mechanism is the saved draft either way.

const DRAFT_KEY = "mibebe:onboarding:v1";

async function readDraft(page: Page) {
  const raw = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    DRAFT_KEY,
  );
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

test("embarazada mode via last menstrual period date", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bienvenida a Mi Bebé" })).toBeVisible();

  await completeOnboarding(page, { babyName: "Silvia" });

  // The nickname collected on its own step reaches the profile the app reads.
  await page.goto("/ajustes");
  await expect(page.locator('input[placeholder="Ej: Silvia"]')).toHaveValue(
    "Silvia",
  );
});

test("embarazada mode via due date (ecografía method)", async ({ page }) => {
  await completeOnboarding(page, { method: "ecografia" });
});

test("embarazada mode via FIV embryo transfer date", async ({ page }) => {
  await completeOnboarding(page, { method: "fiv" });
});

test("planeando mode skips the pregnancy-only steps", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy planeando / buscando" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  // No LMP/due-date step for this mode — straight to department.
  await expect(page.locator("#dep")).toBeVisible();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  // The account step exists in this mode too; the baby-name and invite steps
  // do not, so "seguir sin cuenta" is the last thing the flow asks.
  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();

  await expect(
    page.getByRole("heading", { name: "Estás planeando tu embarazo" }),
  ).toBeVisible();
});

test("the old 'no te pedimos cuenta' promise is gone from the first screen", async ({
  page,
}) => {
  await page.goto("/");
  // K1 deletes it; the app now asks for an account as its main path, and a
  // screen that says otherwise while doing so is the contradiction the Fable
  // review found.
  await expect(page.getByText(/No te pedimos cuenta/i)).toHaveCount(0);
  await expect(page.getByText(/sin cuenta/i).first()).toBeVisible();
});

test("the account step is reached, and offers a way past it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  await page
    .locator("#lmp")
    .fill(new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();
  // K9-F5's "tu situación", skipped without answering anything.
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: /sin cuenta|Guardá tu embarazo/ })).toBeVisible();
  // Never a dead end, in either configuration.
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();
});

test("leaving the flow at the account step and coming back resumes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Papá" }).click();
  await page
    .locator("#lmp")
    .fill(new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.locator("#city").fill("Luque");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();

  // Everything answered so far is durable before the account step can send the
  // browser anywhere: this is what makes an abandoned sign-in survivable.
  const draft = await readDraft(page);
  expect(draft).toMatchObject({
    step: "cuenta",
    role: "papa",
    city: "Luque",
    profileSaved: true,
  });

  // Stand in for the OAuth round trip: a full navigation away and back, which
  // is exactly what Google does to this page. Nothing in React survives it.
  await page.goto("/ajustes");
  await page.goto("/");

  // Resumed on the account step, not back at "¿Cómo querés usar Mi Bebé?".
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Estoy embarazada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  // Finishing forgets the draft; the next open is the app, not the flow.
  expect(await readDraft(page)).toBeNull();
  await page.reload();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("abandoning at the account step still leaves a working app underneath", async ({
  page,
}) => {
  await completeOnboarding(page);
  // Sanity: the finished flow leaves the real app, reachable and offline-ready,
  // with no account anywhere in it.
  await page.goto("/herramientas");
  await expect(page.getByRole("heading", { name: "Herramientas" })).toBeVisible();

  const cookies = await page.context().cookies();
  expect(
    cookies.filter((c) => c.name.includes("authjs") || c.name.includes("next-auth")),
  ).toEqual([]);
});

// K1's /api/v1/auth-status is what tells the client-side onboarding whether an
// account is possible here. Its handler imports next-auth, which does not load
// under vitest, so its boundary behaviour is asserted against a real build.
test("/api/v1/auth-status answers honestly and takes no parameters", async ({
  request,
}) => {
  const res = await request.get("/api/v1/auth-status");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ providers: [], signedIn: false });
  expect(res.headers()["cache-control"]).toBe("no-store");

  for (const param of ["week=24", "department=capital", "email=a@b.c"]) {
    const rejected = await request.get(`/api/v1/auth-status?${param}`);
    expect(rejected.status(), `${param} must be rejected`).toBe(400);
  }
});

// ---------------------------------------------------------------------------
// K9-F5 — onboarding depth, and the invited path
// ---------------------------------------------------------------------------

/**
 * Take "Seguir sin cuenta", whichever face the account step is wearing.
 *
 * With providers configured the invited flow labels it "Seguir sin cuenta (tu
 * código queda para después)" — honest about what skipping costs somebody
 * holding a code. CI has no auth at all, so the step renders its
 * "por ahora, sin cuenta" face with the plain label instead. Both are the same
 * escape hatch and neither is a dead end, which is the property these tests
 * are actually about.
 */
async function skipAccountStep(page: Page) {
  await page.getByRole("button", { name: /^Seguir sin cuenta/ }).click();
}

test("a companion is never asked about a body he does not have", async ({ page }) => {
  // The bug: a papá tapping his pareja's WhatsApp link was asked for the first
  // day of his last menstruation, and then for a department, before the app
  // would show him anything.
  await page.goto("/");
  await page.getByRole("button", { name: "Usar mi código" }).click();
  await page.getByRole("button", { name: "Papá" }).click();

  // Straight to the account step. No date, no department.
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();
  await expect(page.locator("#lmp")).toHaveCount(0);
  await expect(page.locator("#dep")).toHaveCount(0);

  const draft = await readDraft(page);
  expect(draft).toMatchObject({ invited: true, role: "papa", step: "cuenta" });
  // The device row is written on leaving `role` for this path, because there
  // is no department step to write it on.
  expect(draft).toMatchObject({ profileSaved: true });
});

test("the código step comes after the account step, and never traps anybody", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Usar mi código" }).click();
  await page.getByRole("button", { name: "Papá" }).click();
  await skipAccountStep(page);

  await expect(page.getByRole("heading", { name: "Poné tu código" })).toBeVisible();
  // CI has no auth, so there is no session to redeem against — and the step
  // says so rather than offering a button that can only fail.
  await expect(page.getByRole("button", { name: "Usar el código" })).toBeDisabled();

  // A code that cannot work must not be the wall between somebody and the app
  // they just installed.
  await page.getByRole("button", { name: "Seguir sin código" }).click();
  await expect(page.getByRole("heading", { name: "Bienvenida a Mi Bebé" })).toHaveCount(0);
  expect(await readDraft(page)).toBeNull();
});

test("an invitation link starts the invited flow with the code already in it", async ({
  page,
}) => {
  await page.goto("/?codigo=abc123");
  // Tapping the link answered "¿cómo querés usar Mi Bebé?".
  await expect(page.getByRole("button", { name: "Papá" })).toBeVisible();
  await page.getByRole("button", { name: "Papá" }).click();
  await skipAccountStep(page);

  // Prefilled and upper-cased — but NOT redeemed. A single-use capability that
  // spends itself on page load can be burned by a link preview or a mis-tap.
  await expect(page.locator("#invite-code")).toHaveValue("ABC123");
});

test("a profile with no pregnancy gets a screen, not a crash", async ({ page }) => {
  // The state the invited path creates on purpose: a real profile, no
  // pregnancy row, and no shared view to build a week from.
  await page.goto("/");
  await page.getByRole("button", { name: "Usar mi código" }).click();
  await page.getByRole("button", { name: "Papá" }).click();
  await skipAccountStep(page);
  await page.getByRole("button", { name: "Seguir sin código" }).click();

  await expect(
    page.getByRole("heading", { name: "Todavía no te conectamos" }),
  ).toBeVisible();
  // Everything that does not need a week still works, and it says so.
  // Scoped to the page: the bottom nav has a "Guías" link on every screen, and
  // the point here is that *this* screen offers somewhere to go.
  await expect(
    page.getByRole("main").getByRole("link", { name: "Guías" }),
  ).toBeVisible();
});

test("the situación answers are optional, stored, and changeable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  await page
    .locator("#lmp")
    .fill(new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Contanos un poco más" })).toBeVisible();
  await page.getByRole("button", { name: "Sí, es el primero" }).click();
  await page.getByRole("button", { name: "Trabajo sin IPS" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  // /derechos asked this question on every visit and forgot it on every exit.
  // Now it opens on her answer — still selected and still changeable.
  await page.goto("/derechos");
  await expect(
    page.getByRole("button", { name: /Trabajo sin IPS/ }),
  ).toHaveAttribute("aria-pressed", "true");

  // And Ajustes can change it, because "trabajo sin IPS" today is "trabajo y
  // aporto" next month.
  await page.goto("/ajustes");
  const ipsPill = page.getByRole("button", {
    name: "Trabajo y aporto a IPS",
    exact: true,
  });
  await ipsPill.click();
  // Wait for the write, don't race it. The pill's `aria-pressed` is bound to
  // the live profile row, so it flips only once Dexie has actually stored the
  // answer — navigating on the click alone passes on a fast machine and fails
  // on a loaded CI runner, which is exactly what it did.
  await expect(ipsPill).toHaveAttribute("aria-pressed", "true");
  await page.goto("/derechos");
  await expect(
    page.getByRole("button", { name: /Trabajo y aporto a IPS/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("skipping every situación question leaves the app exactly as it was", async ({
  page,
}) => {
  await completeOnboarding(page);

  // Nothing answered means /derechos still asks, rather than guessing at a
  // subsidio she may have no claim to.
  await page.goto("/derechos");
  for (const label of ["Trabajo y aporto a IPS", "Trabajo sin IPS", "No trabajo"]) {
    await expect(page.getByRole("button", { name: new RegExp(label) })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  }

  // And the checklist keeps its hedge, because we do not know.
  await page.goto("/herramientas/checklist");
  await expect(page.getByText("Carné de IPS o seguro (si tenés)")).toBeVisible();
});
