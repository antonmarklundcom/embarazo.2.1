import { describe, expect, it } from "vitest";

import {
  FUNNEL_STORAGE_KEY,
  captureLanding,
  flush,
  isToolPath,
  markOnboarded,
  noteOpen,
  noteToolOpened,
  readState,
  type KeyValueStore,
} from "./funnel.client";
import type { FunnelEvent } from "./funnel";

// Growth plan items 16–18, device half: "once per install" lives here.

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const DAY = 86_400_000;

describe("once per install", () => {
  it("queues the arrival and the QR source on the first load only", () => {
    const store = memory();
    captureLanding("?utm_source=site&utm_medium=week&src=clinica-sur", store);
    captureLanding("?utm_source=site&utm_medium=tool", store);
    expect(readState(store).pending).toEqual([
      { metric: "arrival", key: "week" },
      { metric: "qr", key: "clinica-sur" },
    ]);
    expect(readState(store).channel).toBe("qr");
  });

  it("a direct first load queues nothing and fixes the channel", () => {
    const store = memory();
    captureLanding("", store);
    captureLanding("?utm_source=site&utm_medium=week", store);
    expect(readState(store).pending).toEqual([]);
    expect(readState(store).channel).toBe("directo");
  });

  it("counts onboarding once, under the landing's channel", () => {
    const store = memory();
    captureLanding("?utm_source=site&utm_medium=article", store);
    markOnboarded(1_000, store);
    markOnboarded(2_000, store);
    const state = readState(store);
    expect(state.onboardedAt).toBe(1_000);
    expect(state.pending?.filter((e) => e.metric === "onboarded")).toEqual([
      { metric: "onboarded", key: "sitio-article" },
    ]);
  });

  it("counts the first tool screen after onboarding, not the toolbox, not before", () => {
    const store = memory();
    noteToolOpened("/herramientas/kegel", store);
    expect(readState(store).firstTool).toBeUndefined();
    markOnboarded(0, store);
    noteToolOpened("/herramientas", store);
    expect(readState(store).firstTool).toBeUndefined();
    noteToolOpened("/herramientas/kegel", store);
    noteToolOpened("/herramientas/peso", store);
    expect(readState(store).pending?.filter((e) => e.metric === "first_tool")).toHaveLength(1);
    expect(isToolPath("/herramientas/comer")).toBe(true);
    expect(isToolPath("/semana/3")).toBe(false);
  });

  it("counts a return only from day 7, and only once", () => {
    const store = memory();
    markOnboarded(0, store);
    noteOpen(6 * DAY, store);
    expect(readState(store).return7).toBeUndefined();
    noteOpen(7 * DAY, store);
    noteOpen(30 * DAY, store);
    expect(readState(store).pending?.filter((e) => e.metric === "return7")).toHaveLength(1);
  });

  it("never counts a return for a device with no onboarding stamp", () => {
    const store = memory();
    noteOpen(365 * DAY, store);
    expect(readState(store).pending ?? []).toEqual([]);
  });
});

describe("flush", () => {
  it("drops what the server accepted or rejected as invalid, keeps the rest", async () => {
    const store = memory();
    captureLanding("?utm_source=site&utm_medium=week&src=clinica-sur", store);
    markOnboarded(0, store);
    const answers: Record<string, number> = { arrival: 204, qr: 0, onboarded: 400 };
    await flush(async (e: FunnelEvent) => answers[e.metric] ?? 500, store);
    expect(readState(store).pending).toEqual([{ metric: "qr", key: "clinica-sur" }]);
    await flush(async () => 204, store);
    expect(readState(store).pending).toEqual([]);
  });

  it("never sends one event twice when two flushes overlap", async () => {
    const store = memory();
    captureLanding("?utm_source=site&utm_medium=week", store);
    const sent: FunnelEvent[] = [];
    const send = async (e: FunnelEvent) => {
      sent.push(e);
      await new Promise((r) => setTimeout(r, 5));
      return 204;
    };
    await Promise.all([flush(send, store), flush(send, store)]);
    expect(sent).toEqual([{ metric: "arrival", key: "week" }]);
  });

  it("survives corrupt storage and a throwing sender", async () => {
    const store = memory();
    store.data.set(FUNNEL_STORAGE_KEY, "{not json");
    expect(readState(store)).toEqual({});
    captureLanding("?utm_source=site&utm_medium=home", store);
    await flush(async () => {
      throw new Error("offline");
    }, store);
    expect(readState(store).pending).toEqual([{ metric: "arrival", key: "home" }]);
  });
});
