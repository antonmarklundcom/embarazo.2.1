import { describe, it, expect } from "vitest";
import {
  CHEAP_READ_LIMIT,
  isRateLimited,
  clientKeyFromHeaders,
} from "./rateLimit";

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
  // K14. The leftmost entry is whatever the caller wrote; the rightmost is
  // what our own proxy appended. A limiter keyed on the former counts to one
  // forever against anyone who varies the header.
  it("takes the rightmost x-forwarded-for entry, not the client-supplied one", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientKeyFromHeaders(headers)).toBe("5.6.7.8");
  });

  it("cannot be given a fresh bucket by prepending a forged hop", () => {
    const real = "203.0.113.9";
    const first = new Headers({ "x-forwarded-for": real });
    const forged = new Headers({ "x-forwarded-for": `9.9.9.9, ${real}` });
    expect(clientKeyFromHeaders(forged)).toBe(clientKeyFromHeaders(first));
  });

  it("ignores empty entries left by a sloppy proxy", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, " });
    expect(clientKeyFromHeaders(headers)).toBe("5.6.7.8");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(clientKeyFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("falls back to unknown when no IP header is present", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});

// K14 — the second tier.
describe("the cheap-read allowance", () => {
  it("lets a shared address through far past the default limit", () => {
    // One NAT'd wifi is one key. At the default 30 this is a clinic waiting
    // room being told the app is broken.
    const key = "cheap-read-key";
    for (let i = 0; i < 200; i++) {
      expect(isRateLimited(key, 5000, CHEAP_READ_LIMIT)).toBe(false);
    }
  });

  it("still has a ceiling", () => {
    const key = "cheap-read-ceiling";
    for (let i = 0; i < CHEAP_READ_LIMIT; i++) {
      expect(isRateLimited(key, 6000, CHEAP_READ_LIMIT)).toBe(false);
    }
    expect(isRateLimited(key, 6000, CHEAP_READ_LIMIT)).toBe(true);
  });

  it("does not raise the default for everyone else", () => {
    const key = "default-tier";
    for (let i = 0; i < 30; i++) expect(isRateLimited(key, 7000)).toBe(false);
    expect(isRateLimited(key, 7000)).toBe(true);
  });
});
