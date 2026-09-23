import { describe, expect, it } from "vitest";

import { weekMessage, whatsAppShareHref } from "./weekShare";

describe("week share links", () => {
  it("carries the week's text and the public link, nothing else", () => {
    expect(weekMessage(20, "Acompañala al control.", "https://app.embarazo.com.py")).toBe(
      "Semana 20 — Acompañala al control.\n\nSeguí el embarazo semana a semana: https://app.embarazo.com.py",
    );
  });

  it("drops the link line when no public URL is configured", () => {
    expect(weekMessage(8, "Hola.", undefined)).toBe("Semana 8 — Hola.");
  });

  it("opens WhatsApp with no number, so she picks the chat", () => {
    const href = whatsAppShareHref("Semana 8 — ¿Cómo estás?");
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1]!)).toBe("Semana 8 — ¿Cómo estás?");
  });
});
