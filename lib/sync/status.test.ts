import { describe, expect, it } from "vitest";
import { exportCompleteness, syncStatusView } from "./status";

describe("honest account backup status", () => {
  it("does not claim a cloud copy is current after a failed pull with no local changes", () => {
    const view = syncStatusView({ running: false, pending: 0, lastSyncAt: 1, lastError: "HTTP 500" });
    expect(view.title).toContain("No pudimos");
    expect(view.description).toContain("incompleta");
    expect(view.retry).toBe(true);
  });
  it("distinguishes queued local records from active uploading", () => {
    const waiting = syncStatusView({ running: false, pending: 2 });
    expect(waiting.title).toContain("este teléfono");
    expect(waiting.title).not.toContain("Sincronizando");
    expect(syncStatusView({ running: true, pending: 2, lastError: "old" }).title).toContain("Sincronizando");
  });
  it("never calls an unread or never-synced store fully synchronized", () => {
    expect(syncStatusView({ running: false, pending: undefined }).title).toContain("Comprobando");
    expect(syncStatusView({ running: false, pending: 0 }).title).toContain("Todavía no");
  });
  it.each(["busy", "offline", "unavailable", "error"] as const)("requires a local-only choice for %s", outcome => {
    expect(exportCompleteness(outcome)).toBe("local-only");
  });
  it("refuses account mismatch and only marks a completed sync complete", () => {
    expect(exportCompleteness("account-mismatch")).toBe("refused");
    expect(exportCompleteness("ok")).toBe("complete");
  });
});
