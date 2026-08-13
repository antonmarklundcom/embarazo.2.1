import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  INVITE_FORBIDDEN_PATTERNS,
  INVITE_TEXT,
  inviteClipboardText,
  invitePayload,
} from "./invite";

// BUILD-PLAN E3. An invitation is the one message in this app addressed to
// somebody who is not the user, and it gets forwarded. So the tests are about
// what it does *not* say.

describe("invitePayload", () => {
  it("is null when there is nowhere to send anybody", () => {
    // Local development and every build before the domain exists. An
    // invitation to nowhere is worse than no button, so the card renders
    // nothing at all.
    expect(invitePayload(undefined)).toBeNull();
    expect(invitePayload("")).toBeNull();
    expect(invitePayload("   ")).toBeNull();
  });

  it("refuses something that is not a URL", () => {
    expect(invitePayload("mibebe.com.py")).toBeNull();
    expect(invitePayload("javascript:alert(1)")).toBeNull();
  });

  it("carries the app URL and a fixed sentence", () => {
    const payload = invitePayload("https://mibebe.com.py")!;
    expect(payload.url).toBe("https://mibebe.com.py");
    expect(payload.text).toBe(INVITE_TEXT);
    expect(Object.keys(payload).sort()).toEqual(["text", "title", "url"]);
  });
});

describe("what an invitation may never say", () => {
  it("names nothing about this particular pregnancy", () => {
    // "Mirá, estoy en la semana 24" is a tempting personalisation, and it
    // publishes her pregnancy to whoever the message reaches next.
    const message = inviteClipboardText(invitePayload("https://mibebe.com.py")!);
    for (const pattern of INVITE_FORBIDDEN_PATTERNS) {
      expect(pattern.test(message), String(pattern)).toBe(false);
    }
  });

  it("catches the personalisation somebody would actually be tempted to add", () => {
    // The rule has to survive the copy legitimately saying "semana a semana"
    // about the app while still catching "estoy en la semana 24".
    const tempting = `${INVITE_TEXT} Estoy en la semana 24!`;
    expect(INVITE_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(tempting))).toBe(
      true,
    );
    expect(INVITE_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(INVITE_TEXT))).toBe(
      false,
    );
  });

  it("says what the app is, in es-PY", () => {
    expect(INVITE_TEXT).toContain("Paraguay");
    expect(INVITE_TEXT.toLowerCase()).toContain("gratis");
    // Voseo, not tuteo.
    expect(INVITE_TEXT.toLowerCase()).not.toContain(" tienes ");
  });

  it("builds nothing from user data, asserted against the source", () => {
    const source = readFileSync(join(process.cwd(), "lib", "share", "invite.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // No template interpolation of anything but the fixed payload fields.
    expect(code).not.toMatch(/\$\{(?!payload\.)/);
    expect(code).not.toContain("useProfile");
  });
});
