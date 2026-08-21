import { describe, expect, it } from "vitest";

import {
  hasDeletionChannel,
  isPlaceholderEmail,
  supportChannels,
  supportEmail,
} from "./support";

const REAL = "hola@mibebe.com.py";

describe("isPlaceholderEmail", () => {
  it("flags unset and blank", () => {
    expect(isPlaceholderEmail(undefined)).toBe(true);
    expect(isPlaceholderEmail("   ")).toBe(true);
  });

  it("flags the shapes a copied .env.example leaves behind", () => {
    expect(isPlaceholderEmail("hola@example.com")).toBe(true);
    expect(isPlaceholderEmail("___@mibebe.com.py")).toBe(true);
    expect(isPlaceholderEmail("placeholder@mibebe.com.py")).toBe(true);
    expect(isPlaceholderEmail("TBD")).toBe(true);
    expect(isPlaceholderEmail("cambiar@mibebe.com.py")).toBe(true);
  });

  it("flags anything that is not clearly an address", () => {
    // Strict on purpose: this string is printed on a page as a promise that
    // somebody reads it, so "looks roughly like an address" is the wrong bar.
    expect(isPlaceholderEmail("hola")).toBe(true);
    expect(isPlaceholderEmail("hola@mibebe")).toBe(true);
    expect(isPlaceholderEmail("hola @ mibebe.com.py")).toBe(true);
    expect(isPlaceholderEmail("@mibebe.com.py")).toBe(true);
  });

  it("accepts a real address", () => {
    expect(isPlaceholderEmail(REAL)).toBe(false);
    expect(isPlaceholderEmail("  soporte@mibebe.com.py  ")).toBe(false);
  });
});

describe("supportEmail", () => {
  it("answers null rather than a placeholder", () => {
    // C8's lesson, in a different field: three files once shipped
    // `process.env.X || "+595000000000"`, a dead number wearing a fallback's
    // clothes. A default address would be the same mistake.
    expect(supportEmail(undefined)).toBeNull();
    expect(supportEmail("hola@example.com")).toBeNull();
  });

  it("returns the trimmed address when it is real", () => {
    expect(supportEmail(`  ${REAL} `)).toBe(REAL);
  });
});

describe("hasDeletionChannel", () => {
  it("is false when neither channel is configured", () => {
    expect(hasDeletionChannel(supportChannels({}))).toBe(false);
  });

  it("is false when both are placeholders", () => {
    expect(
      hasDeletionChannel(
        supportChannels({
          NEXT_PUBLIC_SUPPORT_EMAIL: "hola@example.com",
          NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595000000000",
        }),
      ),
    ).toBe(false);
  });

  it("is true with either one alone", () => {
    // One way through is enough. Requiring both would be a rule invented here
    // rather than one Play asks for.
    expect(
      hasDeletionChannel(supportChannels({ NEXT_PUBLIC_SUPPORT_EMAIL: REAL })),
    ).toBe(true);
    expect(
      hasDeletionChannel(
        supportChannels({ NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595981123456" }),
      ),
    ).toBe(true);
  });
});
