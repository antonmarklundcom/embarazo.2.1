import { describe, expect, it } from "vitest";

import { isTwaReferrer, offerPlayReview, playStoreUrl } from "./playReview";

// Growth plan item 14: the Play listing only when the switch is set AND the
// app runs inside the Android app; otherwise "¿Cómo te está yendo?" is today's.

const LISTING = "https://play.google.com/store/apps/details?id=com.example.app";

describe("playStoreUrl", () => {
  it("is off when unset, empty or not a Play listing", () => {
    expect(playStoreUrl(undefined)).toBeNull();
    expect(playStoreUrl("")).toBeNull();
    expect(playStoreUrl("  ")).toBeNull();
    expect(playStoreUrl("http://play.google.com/store/apps/details?id=x")).toBeNull();
    expect(playStoreUrl("https://play.google.com.evil.example/store/apps/details?id=x")).toBeNull();
    expect(playStoreUrl("https://example.com/?id=x")).toBeNull();
  });

  it("is on for a Play details URL", () => {
    expect(playStoreUrl(LISTING)).toBe(LISTING);
    expect(playStoreUrl(` ${LISTING}&hl=es_PY `)).toBe(`${LISTING}&hl=es_PY`);
  });
});

describe("offerPlayReview", () => {
  it("needs both the switch and the Android app", () => {
    const twa = "android-app://com.example.app/";
    expect(offerPlayReview({ playUrl: null, referrer: twa, rememberedTwa: true })).toBe(false);
    expect(offerPlayReview({ playUrl: LISTING, referrer: "", rememberedTwa: false })).toBe(false);
    expect(offerPlayReview({ playUrl: LISTING, referrer: "https://www.google.com/", rememberedTwa: false })).toBe(false);
    expect(offerPlayReview({ playUrl: LISTING, referrer: twa, rememberedTwa: false })).toBe(true);
    // After a client-side navigation the referrer is gone; the session remembers.
    expect(offerPlayReview({ playUrl: LISTING, referrer: "", rememberedTwa: true })).toBe(true);
  });

  it("reads the TWA referrer only by its scheme", () => {
    expect(isTwaReferrer("android-app://com.example/")).toBe(true);
    expect(isTwaReferrer("https://android-app.example/")).toBe(false);
    expect(isTwaReferrer(null)).toBe(false);
  });
});
