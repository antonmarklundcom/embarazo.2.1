import { test, expect } from "@playwright/test";

// BUILD-PLAN E6 (feature map #29). The accordion is a keyboard-and-screen-reader
// surface before it is a visual one, so the test checks the ARIA contract, not
// the animation.

test("questions expand, announce themselves, and stay open together", async ({
  page,
}) => {
  await page.goto("/preguntas");

  const question = page.getByRole("button", { name: /¿Quién ve mis datos\?/ });
  await expect(question).toHaveAttribute("aria-expanded", "false");

  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/queda guardado en tu teléfono/)).toBeVisible();

  // A second question does not close the first: somebody comparing "¿quién ve
  // mis datos?" with "¿qué pasa si borro la app?" should not have to re-open
  // the one she just read.
  const second = page.getByRole("button", { name: /¿Qué pasa si borro la app\?/ });
  await second.click();
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await expect(question).toHaveAttribute("aria-expanded", "true");

  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "false");
});

test("the privacy page carries the same answers", async ({ page }) => {
  await page.goto("/privacidad");

  const question = page.getByRole("button", { name: /¿Quién ve mis datos\?/ });
  await expect(question).toBeVisible();
  await question.click();
  // `.first()`: the policy prose above says much the same thing in its own
  // words, which is the point — the accordion repeats the promise where
  // somebody is actually looking for it.
  await expect(page.getByText(/nunca tus notas/i).first()).toBeVisible();

  // …and a way through to the rest of them.
  await page.getByRole("link", { name: "preguntas frecuentes", exact: true }).click();
  await expect(page).toHaveURL(/\/preguntas$/);
});
