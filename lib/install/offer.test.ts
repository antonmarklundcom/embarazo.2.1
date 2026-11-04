import { describe, expect, it } from "vitest";

import { nudgeContextFor, offerPlayLink, parseNudgeMemory, showInstallNudge } from "./offer";

// Night run item 2 — the compact install prompt's rules.

const PLAY = "https://play.google.com/store/apps/details?id=py.com.embarazo.app";

describe("compact install prompt", () => {
  it("never shows once installed, on a computer, or after «Ahora no»", () => {
    const base = { context: "public" as const, memory: {}, standalone: false, device: "android" as const };
    expect(showInstallNudge(base)).toBe(true);
    expect(showInstallNudge({ ...base, standalone: true })).toBe(false);
    expect(showInstallNudge({ ...base, device: "desktop" })).toBe(false);
    expect(showInstallNudge({ ...base, device: null })).toBe(false);
    expect(showInstallNudge({ ...base, memory: { dismissed: true } })).toBe(false);
  });

  it("shows each once-only moment once; public pages until dismissed", () => {
    const memory = { seen: ["onboarded" as const] };
    expect(showInstallNudge({ context: "onboarded", memory, standalone: false, device: "iphone" })).toBe(false);
    expect(showInstallNudge({ context: "first-tool", memory, standalone: false, device: "iphone" })).toBe(true);
    expect(
      showInstallNudge({ context: "public", memory: { seen: ["public"] }, standalone: false, device: "iphone" }),
    ).toBe(true);
  });

  it("reads its memory defensively", () => {
    expect(parseNudgeMemory(null)).toEqual({ dismissed: false, seen: [] });
    expect(parseNudgeMemory("not json")).toEqual({});
    expect(parseNudgeMemory('{"dismissed":"yes","seen":["onboarded","x"]}')).toEqual({
      dismissed: false,
      seen: ["onboarded"],
    });
  });

  it("knows which shell paths are its moments", () => {
    expect(nudgeContextFor("/semana/20", false)).toBe("public");
    expect(nudgeContextFor("/guias/control-prenatal", false)).toBe("public");
    expect(nudgeContextFor("/guias", false)).toBeNull();
    expect(nudgeContextFor("/herramientas/pataditas", false)).toBeNull();
    expect(nudgeContextFor("/herramientas/pataditas", true)).toBe("first-tool");
    expect(nudgeContextFor("/herramientas", true)).toBeNull();
    expect(nudgeContextFor("/", true)).toBeNull();
  });
});

describe("Google Play link", () => {
  it("needs a listing, Android, and a browser outside the Play wrapper", () => {
    expect(offerPlayLink({ playUrl: PLAY, device: "android", insideTwa: false })).toBe(true);
    expect(offerPlayLink({ playUrl: null, device: "android", insideTwa: false })).toBe(false);
    expect(offerPlayLink({ playUrl: PLAY, device: "iphone", insideTwa: false })).toBe(false);
    expect(offerPlayLink({ playUrl: PLAY, device: "android", insideTwa: true })).toBe(false);
  });
});
