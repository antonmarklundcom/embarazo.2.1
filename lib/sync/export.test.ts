import { describe, expect, it, vi } from "vitest";
import { waitForBackupSync } from "./export";

describe("bounded backup synchronization", () => {
  it("offers a local-only path when the shared sync never settles", async () => {
    vi.useFakeTimers();
    try {
      const result = waitForBackupSync(() => new Promise(() => {}), 20_000);
      await vi.advanceTimersByTimeAsync(20_000);
      expect((await result).outcome).toBe("busy");
    } finally { vi.useRealTimers(); }
  });
  it("retains successful completeness and classifies a rejected request incomplete", async () => {
    expect((await waitForBackupSync(async () => ({ outcome: "ok", pushed: 1, pulled: 2, conflicts: 0 }))).outcome).toBe("ok");
    expect((await waitForBackupSync(async () => { throw new Error("offline"); })).outcome).toBe("error");
  });
});
