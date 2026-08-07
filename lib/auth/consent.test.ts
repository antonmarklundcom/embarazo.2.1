import { describe, expect, it } from "vitest";
import {
  CONSENT_TTL_MS,
  CONSENT_VERSION,
  encodeConsent,
  hasValidConsent,
  parseConsent,
} from "./consent";

// BUILD-PLAN A2. ARCHITECTURE.md §8 requires consent to be collected
// explicitly, which only means anything if the ticket is actually checked.
// These cover every way a ticket can fail to authorise a sign-in.

const NOW = 1_770_000_000_000;

describe("encodeConsent / parseConsent round-trip", () => {
  it("accepts a ticket issued right now", () => {
    expect(parseConsent(encodeConsent(NOW), NOW)).toEqual({
      version: CONSENT_VERSION,
      issuedAt: NOW,
    });
  });

  it("accepts a ticket that is old but still inside the window", () => {
    const issued = NOW - CONSENT_TTL_MS + 1000;
    expect(parseConsent(encodeConsent(issued), NOW)?.issuedAt).toBe(issued);
  });
});

describe("parseConsent rejects", () => {
  it("an absent cookie", () => {
    expect(parseConsent(undefined, NOW)).toBeNull();
    expect(parseConsent(null, NOW)).toBeNull();
    expect(parseConsent("", NOW)).toBeNull();
  });

  it("a cookie with no separator", () => {
    expect(parseConsent(CONSENT_VERSION, NOW)).toBeNull();
  });

  it("a cookie with an empty version", () => {
    expect(parseConsent(`|${NOW}`, NOW)).toBeNull();
  });

  it("a ticket for a superseded consent text", () => {
    expect(parseConsent(`2025-01-vieja|${NOW}`, NOW)).toBeNull();
  });

  it("a non-numeric or nonsensical timestamp", () => {
    for (const stamp of ["", "abc", "-1", "0", "1.5", "9007199254740993"]) {
      expect(
        parseConsent(`${CONSENT_VERSION}|${stamp}`, NOW),
        `timestamp ${JSON.stringify(stamp)}`,
      ).toBeNull();
    }
  });

  it("an expired ticket", () => {
    const issued = NOW - CONSENT_TTL_MS - 1;
    expect(parseConsent(encodeConsent(issued), NOW)).toBeNull();
  });

  it("a ticket dated implausibly far in the future", () => {
    expect(parseConsent(encodeConsent(NOW + 5 * 60_000), NOW)).toBeNull();
  });

  it("but tolerates a minute of clock skew", () => {
    expect(parseConsent(encodeConsent(NOW + 30_000), NOW)).not.toBeNull();
  });
});

describe("the ticket carries no identity", () => {
  it("is exactly a version and a timestamp", () => {
    const raw = encodeConsent(NOW);
    expect(raw).toBe(`${CONSENT_VERSION}|${NOW}`);
    expect(raw.split("|")).toHaveLength(2);
  });
});

describe("hasValidConsent", () => {
  it("mirrors parseConsent as a boolean", () => {
    expect(hasValidConsent(encodeConsent(NOW), NOW)).toBe(true);
    expect(hasValidConsent(undefined, NOW)).toBe(false);
    expect(hasValidConsent(encodeConsent(NOW - CONSENT_TTL_MS - 1), NOW)).toBe(
      false,
    );
  });
});
