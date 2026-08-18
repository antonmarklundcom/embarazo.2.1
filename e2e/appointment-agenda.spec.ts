import { test, expect, type BrowserContext } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K8 — the prenatal control as a shared object.
//
// Same stubbed `/api/v1/sharing` as `e2e/companion.spec.ts`: CI has no MySQL
// and no OAuth, so the wire is implemented in-page and the real components,
// the real role rules and the real request bodies are driven in a real browser.
//
// The push half is not exercised here — a Playwright Chromium has no push
// service — so what is asserted about it is the *schedule*: that the device
// sends timestamps and nothing else, which is B5's contract and the property
// K8 must not break. The sentences the service worker writes from those
// timestamps are unit-tested in `lib/appointments.test.ts`.

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
  accompanyingAt?: number | null;
  members?: {
    userId: string;
    role: string;
    createdAt: string;
    accompanyingAt: number | null;
  }[];
}

/** Tomorrow at 09:00, local — the "acompañala al control el jueves a las 9:00" case. */
function tomorrowAt9(): number {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function fakeSharing(initial: View[]) {
  return { views: initial, posts: [] as Record<string, unknown>[] };
}

async function serve(
  context: BrowserContext,
  server: ReturnType<typeof fakeSharing>,
) {
  await context.route("**/api/v1/sharing**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      server.posts.push(request.postDataJSON() as Record<string, unknown>);
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

test("a control can carry an hour, and every sentence about it uses one", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");

  const appointment = tomorrowAt9();
  const date = `${appointment ? new Date(appointment).getFullYear() : ""}-${String(
    new Date(appointment).getMonth() + 1,
  ).padStart(2, "0")}-${String(new Date(appointment).getDate()).padStart(2, "0")}`;

  await page.locator("#appt-date").fill(date);
  await page.locator("#appt-time").fill("09:00");
  await page.getByRole("button", { name: "Guardar el control" }).click();
  await expect(page.getByText("Control guardado.")).toBeVisible();

  // It survives a reload as a time, not as a date that lost its hour.
  await page.reload();
  await expect(page.locator("#appt-date")).toHaveValue(date);
  await expect(page.locator("#appt-time")).toHaveValue("09:00");

  // And the home banner says the hour, because it is tomorrow.
  await page.goto("/");
  const banner = page.getByText(/Tu próximo control es el/);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("09:00");
});

test("leaving the hour blank keeps a date-only control, with no invented 00:00", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");

  const appointment = tomorrowAt9();
  const d = new Date(appointment);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

  await page.locator("#appt-date").fill(date);
  await page.getByRole("button", { name: "Guardar el control" }).click();
  await expect(page.getByText("Control guardado.")).toBeVisible();

  await page.goto("/");
  const banner = page.getByText(/Tu próximo control es el/);
  await expect(banner).toBeVisible();
  // "a las 00:00" would be a time nobody entered.
  await expect(banner).not.toContainText("00:00");
  await expect(banner).not.toContainText("a las");
});

test("the pareja can say they are coming, and it names the control it agreed to", async ({
  browser,
}) => {
  const appointment = tomorrowAt9();
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "partner",
      snapshot: {
        week: 24,
        dueDate: Date.now() + 100 * 86400000,
        nextAppointmentAt: appointment,
        babyName: "Silvia",
        updatedAt: Date.now(),
      },
      accompanyingAt: null,
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/");

  const card = page.getByRole("region", { name: "Su próximo control" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("09:00");

  await card.getByRole("switch", { name: /acompañ/i }).click();

  await expect
    .poll(() => server.posts.find((p) => p.action === "accompany"))
    .toEqual({
      action: "accompany",
      pregnancyId: "preg-1",
      // The timestamp of THIS control, not a boolean: if she moves it, his
      // answer stops matching and everyone is asked again.
      appointmentAt: appointment,
    });

  await context.close();
});

test("the mamá sees who is coming, by role and never by name", async ({
  browser,
}) => {
  const appointment = tomorrowAt9();
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "owner",
      snapshot: {
        week: 24,
        dueDate: Date.now() + 100 * 86400000,
        nextAppointmentAt: appointment,
        babyName: "Silvia",
        updatedAt: Date.now(),
      },
      members: [
        {
          userId: "user-partner",
          role: "partner",
          createdAt: new Date().toISOString(),
          accompanyingAt: appointment,
        },
      ],
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);

  // Her own control, set locally — the marker is about the same minute.
  await page.goto("/ajustes");
  const d = new Date(appointment);
  await page
    .locator("#appt-date")
    .fill(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  await page.locator("#appt-time").fill("09:00");
  await page.getByRole("button", { name: "Guardar el control" }).click();
  await expect(page.getByText("Control guardado.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Te acompaña tu pareja.")).toBeVisible();
  // Never an id, never a name.
  await expect(page.getByText("user-partner")).toHaveCount(0);

  await context.close();
});

test("moving the control invalidates every 'yo la acompaño'", async ({
  browser,
}) => {
  const agreed = tomorrowAt9();
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "owner",
      snapshot: {
        week: 24,
        dueDate: Date.now() + 100 * 86400000,
        nextAppointmentAt: agreed,
        babyName: null,
        updatedAt: Date.now(),
      },
      members: [
        {
          userId: "user-partner",
          role: "partner",
          createdAt: new Date().toISOString(),
          // He agreed to yesterday's plan; she has since moved it.
          accompanyingAt: agreed,
        },
      ],
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await page.goto("/ajustes");

  const moved = new Date(agreed);
  moved.setHours(15, 0, 0, 0);
  await page
    .locator("#appt-date")
    .fill(
      `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, "0")}-${String(
        moved.getDate(),
      ).padStart(2, "0")}`,
    );
  await page.locator("#appt-time").fill("15:00");
  await page.getByRole("button", { name: "Guardar el control" }).click();
  await expect(page.getByText("Control guardado.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/Tu próximo control es el/)).toContainText("15:00");
  // She is told nobody is coming rather than told he will be at a time he
  // never saw. She asks again; the app does not decide for her.
  await expect(page.getByText("Te acompaña tu pareja.")).toHaveCount(0);

  await context.close();
});

test("the companion reminder toggle appears only for a companion", async ({
  browser,
}) => {
  const server = fakeSharing([
    {
      pregnancyId: "preg-1",
      role: "partner",
      snapshot: {
        week: 24,
        dueDate: Date.now() + 100 * 86400000,
        nextAppointmentAt: tomorrowAt9(),
        babyName: null,
        updatedAt: Date.now(),
      },
    },
  ]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page, { role: "Papá", landsOnHome: false });
  await page.goto("/ajustes");

  await expect(page.getByText("Avisame de su control")).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Acompañala al control" }),
  ).toBeVisible();

  await context.close();
});

test("somebody who is not accompanying anyone never sees the toggle", async ({
  browser,
}) => {
  const server = fakeSharing([]);
  const context = await browser.newContext();
  await serve(context, server);
  const page = await context.newPage();

  await completeOnboarding(page);
  await page.goto("/ajustes");

  // No empty "no estás acompañando a nadie" row: it is noise for the ~all of
  // users who are the pregnant one.
  await expect(page.getByText("Avisame de su control")).toHaveCount(0);

  await context.close();
});
