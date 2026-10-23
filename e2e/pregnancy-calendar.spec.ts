import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";
import { localDateInput, localTimeOn } from "./helpers/dates";

async function savedPregnancy(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("mibebe");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ lmpDate: number; dueDate: number; gestationDays?: number; method?: string; plannedDeliveryDate?: number }>((resolve, reject) => {
        const read = database.transaction("pregnancy").objectStore("pregnancy").getAll();
        read.onsuccess = () => resolve(read.result.find((row) => !row.deletedAt));
        read.onerror = () => reject(read.error);
      });
    } finally {
      database.close();
    }
  });
}


test("settings wait for the initial profile and preserve drafts during a later live refresh", async ({ page, context }) => {
  await completeOnboarding(page, { daysAgo: 120 });
  // Synthetic existing custom duration, before the next settings mount.
  await page.evaluate(async () => {
    const open = indexedDB.open("mibebe");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("pregnancy", "readwrite");
        const store = tx.objectStore("pregnancy");
        const read = store.getAll();
        read.onsuccess = () => {
          const row = read.result.find((item) => !item.deletedAt);
          const due = new Date(row.lmpDate);
          due.setDate(due.getDate() + 294);
          // Keep an older tombstone ahead of the displayed live pregnancy.
          store.put({ ...row, deletedAt: Date.now() });
          const live = { ...row, uid: crypto.randomUUID(), gestationDays: 294, dueDate: due.getTime() };
          delete live.id;
          store.add(live);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      database.close();
    }
  });
  // Hold delivery of the real initial profile read; do not replace its data.
  await page.addInitScript(() => {
    const callbacks: (() => void)[] = [];
    let released = false;
    const gate = {
      pending: 0,
      release() {
        released = true;
        for (const callback of callbacks.splice(0)) callback();
        gate.pending = 0;
      },
    };
    Object.assign(window, { settingsProfileReadGate: gate });
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (this: IDBObjectStore, ...args: Parameters<typeof getAll>) {
      const request = getAll.apply(this, args);
      if (location.pathname !== "/ajustes" || this.name !== "profile") return request;
      let handler: IDBRequest["onsuccess"] = null;
      Object.defineProperty(request, "onsuccess", {
        configurable: true,
        get: () => handler,
        set: (next: IDBRequest["onsuccess"]) => { handler = next; },
      });
      request.addEventListener("success", (event) => {
        const deliver = () => handler?.call(request, event);
        if (released) deliver();
        else { gate.pending++; callbacks.push(deliver); }
      });
      return request;
    };
  });
  await page.goto("/ajustes");
  await expect.poll(() => page.evaluate(() => (window as Window & {
    settingsProfileReadGate: { pending: number };
  }).settingsProfileReadGate.pending)).toBeGreaterThan(0);
  await expect(page.getByRole("status").filter({ hasText: "Cargando tus ajustes…" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Duración del embarazo, en días" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar duración", exact: true })).toHaveCount(0);
  await expect(page.locator("#lmp-edit")).toHaveCount(0);
  await page.evaluate(() => (window as Window & {
    settingsProfileReadGate: { release: () => void };
  }).settingsProfileReadGate.release());

  const durationInput = page.getByRole("spinbutton", { name: "Duración del embarazo, en días" });
  await expect(durationInput).toHaveValue("294");
  const editedLmp = localDateInput(-121);
  await page.locator("#lmp-edit").fill(editedLmp);
  await durationInput.fill("266");
  const useDue = page.getByRole("checkbox", { name: /No sé mi última regla/ });
  await useDue.check();

  const second = await context.newPage();
  try {
    await second.goto("/ajustes");
    await second.getByRole("spinbutton", { name: "Duración del embarazo, en días" }).fill("280");
    await second.getByRole("button", { name: "Guardar duración", exact: true }).click();
    await expect(second.getByText("Duración actualizada. Tu fecha probable de parto se recalculó.")).toBeVisible();
    const planned = localDateInput(100);
    await second.getByLabel("Fecha de parto planificada", { exact: true }).fill(planned);
    await second.getByRole("button", { name: "Guardar fecha planificada", exact: true }).click();
    await expect(second.getByText("Fecha planificada guardada.", { exact: true })).toBeVisible();
    const plannedAt = await second.evaluate((value) => new Date(value + "T00:00:00").getTime(), planned);
    await expect.poll(async () => (await savedPregnancy(second)).plannedDeliveryDate).toBe(plannedAt);
    // This prop-derived label proves the first tab received the profile update.
    await expect(page.getByText("Calculamos tu última regla restando 280 días a esta fecha.")).toBeVisible();
    await expect(durationInput).toHaveValue("266");
    await useDue.uncheck();
    await expect(page.locator("#lmp-edit")).toHaveValue(editedLmp);

    await page.getByRole("button", { name: "Guardar duración", exact: true }).click();
    await expect(page.getByText("Duración actualizada. Tu fecha probable de parto se recalculó.")).toBeVisible();
    await expect.poll(async () => (await savedPregnancy(page)).gestationDays).toBe(266);
    await expect(page.locator("#lmp-edit")).toHaveValue(editedLmp);
    await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
    await expect(page.getByText("Fecha actualizada. Tu semana se recalculó.")).toBeVisible();
    const saved = await savedPregnancy(page);
    expect(saved.gestationDays).toBe(266);
    expect(saved.lmpDate).toBe(await page.evaluate((value) => new Date(value + "T00:00:00").getTime(), editedLmp));
  } finally {
    await second.close();
  }
});

for (const duration of [266, 280, 294]) {
  test(`date editing preserves ${duration}-day duration and both FUM/FPP round trips`, async ({ page }) => {
    await completeOnboarding(page, { daysAgo: 120 });
    await page.goto("/ajustes");
    await page.getByRole("spinbutton", { name: "Duración del embarazo, en días" }).fill(String(duration));
    await page.getByRole("button", { name: "Guardar duración", exact: true }).click();
    await expect(page.getByText("Duración actualizada. Tu fecha probable de parto se recalculó.")).toBeVisible();
    await page.locator("#lmp-edit").fill(localDateInput(-121));
    await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
    await expect(page.getByText("Fecha actualizada. Tu semana se recalculó.")).toBeVisible();
    const fromLmp = await savedPregnancy(page);
    expect(fromLmp.gestationDays).toBe(duration);
    expect(fromLmp.method).toBe("lmp");
    const dueInput = await page.evaluate((due) => {
      const date = new Date(due);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }, fromLmp.dueDate);
    await page.getByRole("checkbox", { name: /No sé mi última regla/ }).check();
    await expect(page.getByText(`Calculamos tu última regla restando ${duration} días a esta fecha.`)).toBeVisible();
    await page.locator("#due-edit").fill(dueInput);
    await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
    await expect.poll(async () => (await savedPregnancy(page)).method).toBe("ecografia");
    const fromDue = await savedPregnancy(page);
    expect(fromDue.lmpDate).toBe(fromLmp.lmpDate);
    expect(fromDue.dueDate).toBe(fromLmp.dueDate);
    expect(fromDue.gestationDays).toBe(duration);
    await page.goto("/");
    const dueLabel = await page.evaluate((due) => new Date(due).toLocaleDateString("es-PY", { day: "numeric", month: "short" }), fromDue.dueDate);
    const stat = page.getByText("Fecha probable", { exact: true }).locator("..");
    await expect(stat).toContainText(dueLabel);
  });
}

test("midnight/resume updates all week displays and cannot revive an old browsing selection", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await completeOnboarding(page, { daysAgo: 146 });
  const overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  const title = overview.getByText(/^Semana \d+$/);
  await expect(title).toHaveText("Semana 21");
  for (let index = 0; index < 3; index++) await overview.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(title).toHaveText("Semana 24");
  const beforeMidnight = await page.evaluate(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  });
  await page.clock.setSystemTime(beforeMidnight + 86_400_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(title).toHaveText("Semana 22");
  await page.clock.setSystemTime(beforeMidnight);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(title).toHaveText("Semana 21");
  await expect(overview.getByText("Tu semana actual", { exact: true })).toBeVisible();
  await page.clock.runFor(1100);
  await expect(title).toHaveText("Semana 22");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("21 semanas y 0 días");
  await expect(page.getByText("Días pasados", { exact: true }).locator("..")).toContainText("147");
  await expect(page.getByText("Faltan", { exact: true }).locator("..")).toContainText("133");
  const notice = page.getByRole("heading", { name: "¡Hoy empezás la semana 22!", exact: true });
  await expect(notice).toBeVisible();
  await page.clock.setSystemTime(beforeMidnight + 4 * 86_400_000 + 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("heading", { name: /empez.*semana 22/i })).toHaveCount(0);
  await page.clock.setSystemTime(beforeMidnight + 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(notice).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("mibebe.newWeek.seen", "22");
    window.dispatchEvent(new StorageEvent("storage", { key: "mibebe.newWeek.seen", newValue: "22" }));
  });
  await expect(notice).toHaveCount(0);
});

test("overview respects both week bounds and supports keyboard tab edges and focusable content", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 0 });
  let overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  await expect(overview.getByRole("button", { name: "Semana anterior", exact: true })).toBeDisabled();
  await overview.getByRole("tab", { name: "Para vos", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(overview.getByRole("tab", { name: "Para la familia", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview.getByRole("tab", { name: "Para vos", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(overview.getByRole("tabpanel")).toBeFocused();
  await page.goto("/ajustes");
  await page.locator("#lmp-edit").fill(localDateInput(-287));
  await page.getByRole("button", { name: "Guardar fecha", exact: true }).click();
  await expect(page.getByText("Fecha actualizada. Tu semana se recalculó.")).toBeVisible();
  await page.goto("/");
  overview = page.getByRole("region", { name: "Esta semana, para cada uno", exact: true });
  await expect(overview.getByText("Semana 42", { exact: true })).toBeVisible();
  await expect(overview.getByRole("button", { name: "Semana siguiente", exact: true })).toBeDisabled();
  await overview.getByRole("button", { name: "Semana anterior", exact: true }).click();
  await expect(overview.getByText("Explorando semana 41", { exact: true })).toBeVisible();
  await overview.getByRole("button", { name: "Volver a mi semana", exact: true }).click();
  await expect(overview.getByText("Tu semana actual", { exact: true })).toBeVisible();
});

test("summary includes same-day records after SPA navigation and refreshes when its data changes", async ({ page, context }) => {
  const openedAt = localTimeOn(0, 9);
  const later = openedAt + 60 * 60 * 1000;
  await page.clock.install({ time: openedAt });
  await completeOnboarding(page, { daysAgo: 120 });
  // A full navigation would reset the calendar module and hide this bug.
  await page.evaluate(() => Object.assign(window, { summarySpaMarker: "preserved" }));
  await page.clock.setSystemTime(later);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("link", { name: "Herramientas", exact: true }).click();
  await page.locator('a[href="/herramientas/sintomas"]').click();
  await page.getByRole("button", { name: "Náuseas", exact: true }).click();
  await page.getByRole("button", { name: /^Guardar registro/ }).click();
  await expect(page.getByText("Guardado en tu teléfono.", { exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Herramientas", exact: true }).click();
  await page.locator('a[href="/herramientas/resumen"]').click();
  const sheet = page.locator("article");
  const recent = sheet.getByRole("heading", { name: "Últimas 4 semanas", exact: true }).locator("..");
  await expect(recent).toContainText("Náuseas (1)");
  expect(await page.evaluate(() => "summarySpaMarker" in window)).toBe(true);
  const generated = sheet.getByText(/^Generado el /);
  const initialGeneration = await generated.innerText();
  await page.clock.setSystemTime(later + 30 * 60 * 1000);
  const prep = page.getByRole("region", { name: "Preparar mi control", exact: true });
  await prep.getByLabel("Tus preguntas", { exact: true }).fill("Pregunta sintética");
  await prep.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(generated).toHaveText(initialGeneration);

  // Another local tab changes the live records without remounting the report.
  const newest = later + 60 * 60 * 1000;
  await page.clock.setSystemTime(newest);
  const second = await context.newPage();
  try {
    await second.clock.install({ time: newest });
    await second.goto("/herramientas/sintomas");
    await second.getByRole("button", { name: "Náuseas", exact: true }).click();
    await second.getByRole("button", { name: /^Guardar registro/ }).click();
    await expect(second.getByText("Guardado en tu teléfono.", { exact: true })).toBeVisible();
    await expect(recent).toContainText("Náuseas (2)");
    const newestLabel = await page.evaluate((at) => new Date(at).toLocaleString("es-PY", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }), newest);
    await expect(generated).toHaveText(`Generado el ${newestLabel}`);
  } finally {
    await second.close();
  }
});
