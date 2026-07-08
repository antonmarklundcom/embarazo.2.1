import { describe, it, expect } from "vitest";
import { isRateLimited, clientKeyFromHeaders } from "./rateLimit";

describe("isRateLimited", () => {
  it("allows requests under the limit", () => {
    const key = "ip-a";
    for (let i = 0; i < 30; i++) {
      expect(isRateLimited(key, 1000)).toBe(false);
    }
  });

  it("blocks once a key exceeds the limit within the window", () => {
    const key = "ip-b";
    for (let i = 0; i < 30; i++) isRateLimited(key, 2000);
    expect(isRateLimited(key, 2000)).toBe(true);
  });

  it("resets after the window elapses", () => {
    const key = "ip-c";
    for (let i = 0; i < 30; i++) isRateLimited(key, 3000);
    expect(isRateLimited(key, 3000)).toBe(true);
    expect(isRateLimited(key, 3000 + 60_001)).toBe(false);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 30; i++) isRateLimited("ip-d", 4000);
    expect(isRateLimited("ip-d", 4000)).toBe(true);
    expect(isRateLimited("ip-e", 4000)).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientKeyFromHeaders(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(clientKeyFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("falls back to unknown when no IP header is present", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});
