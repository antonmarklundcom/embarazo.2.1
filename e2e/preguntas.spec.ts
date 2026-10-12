import { test, expect } from "@playwright/test";

// Public community submissions stay closed until reporting and moderation are
// ready. The authored FAQ must remain useful and reachable without an account.
test("FAQ remains public and does not load community questions", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", request => { if (/\/api\/v1\/(mis-preguntas|preguntas)$/.test(new URL(request.url()).pathname)) calls.push(request.url()); });
  await page.route("**/api/v1/auth-status", route => route.fulfill({json:{accountRequired:true, signedIn:false, accountId:null, providers:[]}}));
  await page.goto("/preguntas");
  await expect(page.getByRole("heading", {name:"Preguntas frecuentes",exact:true})).toBeVisible();
  await expect(page.getByRole("button", {name:"¿Tengo que crear una cuenta?"})).toBeVisible();
  await page.getByRole("button", {name:"¿Tengo que crear una cuenta?"}).click();
  await expect(page.getByText(/para el seguimiento personal necesitás una cuenta/)).toBeVisible();
  await expect(page.getByRole("heading", {name:"Mandanos tu pregunta"})).toHaveCount(0);
  await expect(page.getByRole("textbox", {name:"Tu pregunta"})).toHaveCount(0);
  expect(calls).toEqual([]);
});

test("disabled submissions are refused by the real server", async ({ request }) => {
  const response = await request.post("/api/v1/mis-preguntas", {data:{question:"No publiques esta pregunta de prueba"}});
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("no está disponible");
  const published = await request.get("/api/v1/preguntas");
  expect(await published.json()).toEqual({questions:[]});
  expect(published.headers()["cache-control"]).toBe("no-store");
});
