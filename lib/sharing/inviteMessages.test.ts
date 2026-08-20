import { describe, it, expect } from "vitest";

import { inviteFailureMessage } from "./inviteMessages";

describe("inviteFailureMessage", () => {
  it("names the two failures the holder can act on", () => {
    expect(inviteFailureMessage("expired")).toContain("venció");
    expect(inviteFailureMessage("used")).toContain("ya fue usado");
  });

  it("does not blame the code for a dropped connection", () => {
    // The bug this extraction fixed: `offline` fell through to "no
    // encontramos ese código", sending somebody back to WhatsApp to ask for a
    // replacement that would fail exactly the same way.
    const offline = inviteFailureMessage("offline");
    expect(offline).not.toContain("encontramos");
    expect(offline).toContain("internet");
  });

  it("has something true to say about a reason it has never seen", () => {
    for (const reason of [undefined, "", "some-new-server-reason"]) {
      expect(inviteFailureMessage(reason)).toBe("No encontramos ese código.");
    }
  });
});
