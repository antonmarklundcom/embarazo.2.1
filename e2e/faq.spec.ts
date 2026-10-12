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
  await expect(page.getByText(/Tus registros se sincronizan con tu cuenta mediante HTTPS/)).toBeVisible();

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

test("the privacy policy explains sync, PIN recovery and public deletion", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", {name:"Política de privacidad",exact:true})).toBeVisible();
  await expect(page.getByText(/tus registros sincronizados no tienen cifrado de extremo a extremo/)).toBeVisible();
  await expect(page.getByText(/Las notas protegidas con PIN se cifran en tu navegador y no se sincronizan/)).toBeVisible();
  await expect(page.getByText(/No compartimos el diario, síntomas ni fotos con los invitados/)).toBeVisible();
  await page.getByRole("link",{name:"borrar tu cuenta",exact:true}).click();
  await expect(page).toHaveURL(/\/borrar-cuenta$/);
});