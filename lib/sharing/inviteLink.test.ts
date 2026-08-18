import { describe, it, expect } from "vitest";

import { INVITE_FORBIDDEN_PATTERNS } from "@/lib/share/invite";
import { generateInviteCode, isValidInviteCode } from "./fields";
import {
  INVITE_CODE_PARAM,
  familyInviteClipboardText,
  familyInvitePayload,
  familyInviteUrl,
  familyInviteWhatsAppUrl,
  inviteCodeFromSearch,
} from "./inviteLink";

// BUILD-PLAN K1. The invitation is the one message this app composes for
// somebody who is not the user, and it is the one that gets forwarded.

const APP = "https://mibebe.com.py";
const CODE = "ABCD234XYZ";

describe("familyInviteUrl", () => {
  it("builds a link that carries the code and nothing else", () => {
    const url = familyInviteUrl(APP, CODE)!;
    expect(url).toBe(`${APP}/familia?${INVITE_CODE_PARAM}=${CODE}`);
    expect([...new URL(url).searchParams.keys()]).toEqual([INVITE_CODE_PARAM]);
  });

  it("tolerates a trailing slash on the configured app URL", () => {
    expect(familyInviteUrl("https://mibebe.com.py/", CODE)).toBe(
      familyInviteUrl(APP, CODE),
    );
  });

  it("returns null rather than a link to nowhere", () => {
    expect(familyInviteUrl(undefined, CODE)).toBeNull();
    expect(familyInviteUrl("", CODE)).toBeNull();
    expect(familyInviteUrl("   ", CODE)).toBeNull();
    // Not a URL we would ever have issued.
    expect(familyInviteUrl("javascript:alert(1)", CODE)).toBeNull();
    expect(familyInviteUrl("mibebe.com.py", CODE)).toBeNull();
  });

  it("refuses a code that is not shaped like an invite code", () => {
    // A malformed code is a bug or a typo; sending it produces a link that can
    // only ever fail, and the failure lands on the person who was invited.
    expect(familyInviteUrl(APP, "")).toBeNull();
    expect(familyInviteUrl(APP, "short")).toBeNull();
    expect(familyInviteUrl(APP, "ABCD234XY0")).toBeNull(); // 0 is not in the alphabet
    expect(familyInviteUrl(APP, `${CODE}&role=owner`)).toBeNull();
  });
});

describe("the invitation text", () => {
  it("never carries anything about the pregnancy", () => {
    for (const role of ["partner", "family"] as const) {
      const payload = familyInvitePayload(APP, CODE, role)!;
      const message = familyInviteClipboardText(payload);
      for (const pattern of INVITE_FORBIDDEN_PATTERNS) {
        expect(pattern.test(message), `${role}: ${pattern}`).toBe(false);
      }
    }
  });

  it("says something different to a pareja than to the familia", () => {
    const partner = familyInvitePayload(APP, CODE, "partner")!;
    const family = familyInvitePayload(APP, CODE, "family")!;
    expect(partner.text).not.toBe(family.text);
    // Both are voseo, which is the app's register everywhere else.
    expect(partner.text).toMatch(/Entrá/);
    expect(family.text).toMatch(/Entrá/);
  });

  it("puts the code in the link and never in the prose", () => {
    const payload = familyInvitePayload(APP, CODE, "partner")!;
    expect(payload.text).not.toContain(CODE);
    expect(payload.url).toContain(CODE);
  });

  it("opens WhatsApp's own contact picker, with no number of ours", () => {
    const payload = familyInvitePayload(APP, CODE, "family")!;
    const wa = new URL(familyInviteWhatsAppUrl(payload));
    expect(wa.host).toBe("wa.me");
    expect(wa.pathname).toBe("/");
    expect(wa.searchParams.get("text")).toBe(familyInviteClipboardText(payload));
  });

  it("is null whenever the link is", () => {
    expect(familyInvitePayload(undefined, CODE, "partner")).toBeNull();
    expect(familyInvitePayload(APP, "nope", "partner")).toBeNull();
  });
});

describe("inviteCodeFromSearch", () => {
  it("reads a code the owner sent", () => {
    expect(inviteCodeFromSearch(`?${INVITE_CODE_PARAM}=${CODE}`)).toBe(CODE);
    expect(inviteCodeFromSearch(`${INVITE_CODE_PARAM}=${CODE}`)).toBe(CODE);
    expect(inviteCodeFromSearch(`?${INVITE_CODE_PARAM}=abcd234xyz`)).toBe(CODE);
    expect(inviteCodeFromSearch(`?x=1&${INVITE_CODE_PARAM}=${CODE}`)).toBe(CODE);
  });

  it("returns null for anything that is not a code", () => {
    expect(inviteCodeFromSearch("")).toBeNull();
    expect(inviteCodeFromSearch("?otra=cosa")).toBeNull();
    expect(inviteCodeFromSearch(`?${INVITE_CODE_PARAM}=`)).toBeNull();
    expect(inviteCodeFromSearch(`?${INVITE_CODE_PARAM}=no-es-un-codigo`)).toBeNull();
  });

  it("round-trips a freshly generated code", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(isValidInviteCode(code)).toBe(true);
      const url = new URL(familyInviteUrl(APP, code)!);
      expect(inviteCodeFromSearch(url.search)).toBe(code);
    }
  });
});
