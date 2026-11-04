import { describe, expect, it } from "vitest";

import { isPublicAppPath } from "@/lib/auth/access";
import { qrSource } from "@/lib/stats/funnel";
import { SHARE_SOURCES, appOrigin, isShareSource, shareLink, weekShareLink } from "./links";

// Night run item 1 — every shared link lands on a page that opens without an
// account, and carries a `?src=` the funnel reads.

const APP = "https://app.embarazo.com.py";

describe("share links", () => {
  it("needs a real http(s) origin, and drops a trailing slash", () => {
    expect(appOrigin(undefined)).toBeNull();
    expect(appOrigin("  ")).toBeNull();
    expect(appOrigin("javascript:alert(1)")).toBeNull();
    expect(appOrigin("app.embarazo.com.py")).toBeNull();
    expect(appOrigin(`${APP}/`)).toBe(APP);
  });

  it("appends ?src= or &src=", () => {
    expect(shareLink(APP, "/cuenta", "invita")).toBe(`${APP}/cuenta?src=invita`);
    expect(shareLink(APP, "/x?a=1", "invita")).toBe(`${APP}/x?a=1&src=invita`);
    expect(shareLink(undefined, "/cuenta", "invita")).toBeNull();
  });

  it("links a week's share to that public week page", () => {
    expect(weekShareLink(APP, 20, "semana")).toBe(`${APP}/semana/20?src=semana`);
    expect(weekShareLink(APP, 7, "pareja")).toBe(`${APP}/semana/7?src=pareja`);
    expect(weekShareLink(APP, 0, "semana")).toBeNull();
    expect(weekShareLink(APP, 43, "semana")).toBeNull();
    expect(isPublicAppPath("/semana/20")).toBe(true);
    expect(isPublicAppPath("/cuenta")).toBe(true);
  });

  it("uses share words the funnel's ?src= reader accepts unchanged", () => {
    for (const word of SHARE_SOURCES) {
      expect(qrSource(word)).toBe(word);
      expect(isShareSource(word)).toBe(true);
    }
    expect(isShareSource("clinica-sur")).toBe(false);
    expect(isShareSource(null)).toBe(false);
  });
});
