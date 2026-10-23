import type { SyncSummary } from "./client";

/** A stalled shared operation must not prevent an explicit local-only backup. */
export async function waitForBackupSync(
  synchronize: () => Promise<SyncSummary>,
  timeoutMs = 20_000,
): Promise<SyncSummary> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      synchronize().catch((): SyncSummary => ({ outcome: "error", pushed: 0, pulled: 0, conflicts: 0 })),
      new Promise<SyncSummary>(resolve => {
        timer = setTimeout(() => resolve({ outcome: "busy", pushed: 0, pulled: 0, conflicts: 0 }), timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
