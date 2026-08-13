import { describe, expect, it } from "vitest";

import {
  businessWhatsApp,
  defaultPrefill,
  isPlaceholderWhatsApp,
  toWaDigits,
  waLink,
} from "./whatsapp";

// BUILD-PLAN C8. The tests that matter here are the placeholder ones: three
// screens shipped `process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000"`,
// so with the variable unset — its state today — every one of those buttons
// opened a chat with nobody. One of them was on the contractions screen.

describe("isPlaceholderWhatsApp", () => {
  it("rejects the all-zero fallback that used to ship", () => {
    expect(isPlaceholderWhatsApp("+595000000000")).toBe(true);
  });

  it("rejects Z1's invented seed range", () => {
    expect(isPlaceholderWhatsApp("+595981000123")).toBe(true);
    expect(isPlaceholderWhatsApp("+595 981 000 123")).toBe(true);
  });

  it("rejects unset, empty and malformed numbers", () => {
    for (const value of [undefined, "", "   ", "0981123456", "+5959811234", "hola"]) {
      expect(isPlaceholderWhatsApp(value), String(value)).toBe(true);
    }
  });

  it("accepts a real +595 number", () => {
    expect(isPlaceholderWhatsApp("+595981234567")).toBe(false);
    expect(isPlaceholderWhatsApp("595981234567")).toBe(false);
  });
});

describe("businessWhatsApp", () => {
  it("answers null rather than a number nobody answers", () => {
    // The call sites branch on this: no number, no button. A "contanos cómo te
    // va" button that opens a chat with nobody is worse than no button.
    expect(businessWhatsApp(undefined)).toBeNull();
    expect(businessWhatsApp("+595000000000")).toBeNull();
    expect(businessWhatsApp("+595981234567")).toBe("+595981234567");
  });
});

describe("the link itself", () => {
  it("strips formatting and encodes the message", () => {
    expect(toWaDigits("+595 981 234-567")).toBe("595981234567");
    const link = waLink("+595981234567", "Hola! ¿Qué tal?");
    expect(link.startsWith("https://wa.me/595981234567?text=")).toBe(true);
    expect(link).toContain("%C2%BFQu%C3%A9");
  });

  it("names the week only when there is one", () => {
    expect(defaultPrefill(24)).toContain("semana 24");
    expect(defaultPrefill()).not.toContain("semana");
  });
});
