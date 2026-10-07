import { describe, expect, it } from "vitest";

import { refuseCrossSite, refuseOtherAccount } from "./requestGuard";

// F08 — com.py is a public suffix, so embarazo.com.py and app.embarazo.com.py
// are the SAME SITE: the Lax session cookie rides along on a no-cors POST from
// the root domain. These handlers parsed such a text/plain body as JSON.

function post(headers: Record<string, string>): Request {
  return new Request("https://app.embarazo.com.py/api/v1/photos", {
    method: "POST",
    headers: { host: "app.embarazo.com.py", ...headers },
    body: "{}",
  });
}

describe("refuseCrossSite (F08)", () => {
  it("accepts the app's own JSON fetch", () => {
    expect(refuseCrossSite(post({ "sec-fetch-site": "same-origin", "content-type": "application/json" }))).toBeNull();
  });

  it("refuses a same-site page (the root domain) even with JSON", () => {
    expect(refuseCrossSite(post({ "sec-fetch-site": "same-site", "content-type": "application/json" }))?.status).toBe(403);
  });

  it("refuses a cross-site page", () => {
    expect(refuseCrossSite(post({ "sec-fetch-site": "cross-site", "content-type": "application/json" }))?.status).toBe(403);
  });

  it("refuses the text/plain body a no-cors POST is limited to", () => {
    expect(refuseCrossSite(post({ "sec-fetch-site": "same-origin", "content-type": "text/plain;charset=UTF-8" }))?.status).toBe(415);
  });

  it("without Sec-Fetch-Site (older Safari), checks the Origin host", () => {
    expect(refuseCrossSite(post({ origin: "https://app.embarazo.com.py", "content-type": "application/json" }))).toBeNull();
    expect(refuseCrossSite(post({ origin: "https://embarazo.com.py", "content-type": "application/json" }))?.status).toBe(403);
  });

  it("trusts the forwarded host behind Hostinger's proxy", () => {
    const req = new Request("http://127.0.0.1:3000/api/v1/sync", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        "x-forwarded-host": "app.embarazo.com.py",
        origin: "https://app.embarazo.com.py",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(refuseCrossSite(req)).toBeNull();
  });

  it("accepts JSON with a charset parameter", () => {
    expect(refuseCrossSite(post({ "sec-fetch-site": "same-origin", "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });
});

describe("refuseOtherAccount (F01)", () => {
  it("lets a request through when it names the session's own account, or none", () => {
    expect(refuseOtherAccount(post({ "x-mibebe-account": "u1" }), "u1")).toBeNull();
    expect(refuseOtherAccount(post({}), "u1")).toBeNull();
  });

  it("refuses a request that says it carries another account's data", () => {
    expect(refuseOtherAccount(post({ "x-mibebe-account": "u-previous" }), "u1")?.status).toBe(409);
  });
});
