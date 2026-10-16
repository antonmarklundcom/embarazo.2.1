import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";

function serveAccount(context: BrowserContext, account: { current: string | null }) {
  return context.route("**/api/v1/auth-status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      providers: ["google"], credentialsAvailable: false, accountRequired: true,
      signedIn: account.current !== null, accountId: account.current,
    }),
  }));
}

async function replaceOwner(page: Page, accountId: string) {
  await page.evaluate(async (newOwner) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("mibebe");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["syncState"], "readwrite");
      transaction.objectStore("syncState").put({ key: "default", lastPulledAt: 0, accountId: newOwner });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, accountId);
}

test("new users see the welcome before signing in and have no guest-entry button", async ({ page, context }) => {
  await serveAccount(context, { current: null });
  await page.goto("/");
  await expect(page).toHaveURL(/\/cuenta\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Tu embarazo, con más calma." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Lo que podés hacer con Mi Bebé" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Estoy embarazada\b/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Seguir sin cuenta" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver consejos", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Empezar mi seguimiento" }).click();
  await expect(page.getByRole("heading", { name: "Tu embarazo, organizado en un solo lugar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leer las guías" })).toBeVisible();
});

test("emergency information, account deletion and authored FAQ remain public", async ({ page, context }) => {
  await serveAccount(context, { current: null });
  for (const path of ["/emergencia", "/borrar-cuenta", "/preguntas", "/privacidad", "/terminos"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
  }
});

test("calculator dates stay local through a signed-out tool redirect", async ({ page, context }) => {
  await serveAccount(context, { current: null });
  await page.goto("/herramientas/resumen?utm_source=site#fum=2026-08-01");
  await expect(page).toHaveURL(/\/cuenta\?returnTo=/);
  expect(page.url()).not.toContain("2026-08-01");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mibebe.auth.handoff.v1") ?? "null"));
  expect(saved).toMatchObject({
    returnTo: "/herramientas/resumen?utm_source=site",
    patch: { method: "lmp", lmp: "2026-08-01" },
  });
});

test("signed-in tool entry completes a fresh profile before opening the tool", async ({ page, context }) => {
  await serveAccount(context, { current: "owner" });
  await page.goto("/herramientas/resumen");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /^Estoy embarazada\b/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mibebe.auth.handoff.v1") ?? "null").returnTo)).toBe("/herramientas/resumen");
  await page.getByRole("button",{name:/^Estoy embarazada\b/}).click();
  await page.getByRole("button",{name:"Mamá"}).click();
  await page.locator("#lmp").fill(new Date(Date.now()-70*86400000).toISOString().slice(0,10));
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await page.locator("#dep").selectOption({index:1});
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  // Already authenticated: continue with the verified account, no guest option.
  await expect(page.getByRole("heading",{name:"Listo, ya entraste"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Seguir sin cuenta"})).toHaveCount(0);
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await expect(page.locator("#babyName")).toBeVisible();
  await page.getByRole("button",{name:"Continuar",exact:true}).click();
  await page.getByRole("button",{name:"Empezar",exact:true}).click();
  await page.getByRole("button",{name:"Ahora no",exact:true}).click();
  await expect(page).toHaveURL(/\/herramientas\/resumen$/);
  await expect(page.locator("main h1")).toContainText(/control/i);
});

test("a different account cannot open the device's existing pregnancy", async ({ page, context }) => {
  await completeOnboarding(page);
  const account = { current: "owner" as string | null };
  await serveAccount(context, account);
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  account.current = "other";
  await page.goto("/herramientas/resumen");
  await expect(page.getByRole("heading", { name: "Este teléfono tiene datos de otra cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Descargar/ })).toHaveCount(0);
});

test("local-owner changes in another tab revoke an already-open private screen", async ({ page, context }) => {
  await completeOnboarding(page);
  await serveAccount(context, { current: "owner" });
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  const second = await context.newPage();
  await second.goto("/guias");
  // Dexie's browser observable broadcasts committed IndexedDB mutations.
  // A native IDB fixture requires the same notification to represent app restore.
  await replaceOwner(second, "other");
  await second.evaluate(() => {
    const channel = new BroadcastChannel("x-storagemutated-1");
    channel.postMessage({ "idb://mibebe/syncState/": { d: 1, from: "default", to: "default" } });
    channel.close();
  });
  await expect(page.getByRole("heading", { name: "Este teléfono tiene datos de otra cuenta" })).toBeVisible();
  await expect(page.getByText("Tip de hoy")).toHaveCount(0);
});

test("overlapping rechecks cannot let a stale signed-in answer reopen signed-out records", async ({ page, context }) => {
  await completeOnboarding(page);
  await serveAccount(context, { current: "owner" });
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  let requestNumber = 0;
  let stale: (() => void) | undefined;
  const delay = new Promise<void>((resolve) => { stale = resolve; });
  await context.route("**/api/v1/auth-status", async (route) => {
    if (++requestNumber === 1) {
      await delay;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accountRequired: true, signedIn: true, accountId: "owner", providers: [] }) }).catch(() => {});
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accountRequired: true, signedIn: false, accountId: null, providers: [] }) });
    }
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => requestNumber).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/cuenta/);
  stale?.();
  await expect(page.getByText("Tip de hoy")).toHaveCount(0);
});

test("offline continuation belongs to the verified owner and ends immediately on sign-out", async ({ page, context }) => {
  await completeOnboarding(page);
  await serveAccount(context, { current: "owner" });
  await page.goto("/");
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await context.route("**/api/v1/auth-status", (route) => route.abort());
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Sin internet: estás viendo los registros guardados de tu cuenta.")).toBeVisible();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem("mibebe.auth.offline.v1");
    window.dispatchEvent(new Event("mibebe:account-access-revoked"));
  });
  await expect(page.getByRole("heading", { name: "No pudimos comprobar tu cuenta" })).toBeVisible();
  await expect(page.getByText("Tip de hoy")).toHaveCount(0);
  await context.setOffline(false);
});

test("a contact-only imported profile does not bypass personal setup",async({page,context})=>{
  await serveAccount(context,{current:"owner"});
  await page.goto("/");
  await expect(page.getByRole("button",{name:/^Estoy embarazada\b/})).toBeVisible();
  await page.goto("/emergencia");
  await page.evaluate(async()=>{
    const database=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("mibebe");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise<void>((resolve,reject)=>{const t=database.transaction("profile","readwrite");t.objectStore("profile").add({createdAt:1,sanatorioName:"Demo hospital",sanatorioPhone:"+595981111222"});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});
    database.close();
  });
  await page.goto("/herramientas/resumen");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button",{name:/^Estoy embarazada\b/})).toBeVisible();
});

test("a signed-in calculator arrival keeps its date through ownership setup",async({page,context})=>{
  await serveAccount(context,{current:"owner"});
  const fum=new Date(Date.now()-70*86400000).toISOString().slice(0,10);
  await page.goto('/#fum='+fum);
  await page.getByRole("button",{name:/^Estoy embarazada\b/}).click();
  await page.getByRole("button",{name:"Mamá"}).click();
  await expect(page.locator("#lmp")).toHaveValue(fum);
  expect(new URL(page.url()).hash).toBe("");
});
