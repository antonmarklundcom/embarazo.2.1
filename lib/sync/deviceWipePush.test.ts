import { beforeEach, describe, expect, it, vi } from "vitest";

// The privacy half of "Borrar datos de este teléfono": this phone's push
// subscription must be ended BEFORE the session is, and a slow or failing push
// call must never stop the sign-out or the wipe. Everything the wipe touches is
// mocked so the order of events is the only thing under test.

const events: string[] = [];
let endPush: () => Promise<void>;

vi.mock("@/lib/db", () => ({
  db: () => ({ syncState: { get: async () => undefined } }),
  wipeAllData: async () => { events.push("wipe"); },
}));
vi.mock("@/lib/crypto", () => ({ clearPin: () => { events.push("pin"); } }));
vi.mock("@/lib/onboarding/draftStorage", () => ({ clearOnboardingDraft: () => {} }));
vi.mock("@/lib/sw/privateCaches", () => ({ purgePrivateCaches: async () => { events.push("purge"); } }));
vi.mock("./client", () => ({ pauseSyncForDeviceWipe: async () => {}, resumeSyncAfterFailedWipe: () => { events.push("resume"); } }));
vi.mock("@/lib/photos/client", () => ({ pausePhotoSyncForDeviceWipe: async () => {}, resumePhotoSyncAfterFailedWipe: () => {} }));
vi.mock("@/lib/push/client", () => ({ endPushForSignOut: () => endPush() }));

describe("wipeSignedOutDevice and push", () => {
  beforeEach(() => {
    events.length = 0;
    endPush = async () => { events.push("push-off"); };
    vi.stubGlobal("fetch", async () => Response.json({ signedIn: false }));
  });

  it("ends push before the session ends and before local data is wiped", async () => {
    const { wipeSignedOutDevice } = await import("./deviceWipe");
    await wipeSignedOutDevice(async () => { events.push("signout"); });
    expect(events).toEqual(["push-off", "signout", "purge", "wipe", "pin"]);
  });

  it("still signs out and wipes when ending push settles late", async () => {
    // endPushForSignOut itself is bounded to 4 s (see clientTimeouts.test.ts);
    // here it just resolves late and the wipe must wait for it, in order.
    endPush = () => new Promise((resolve) => setTimeout(() => { events.push("push-off"); resolve(); }, 30));
    const { wipeSignedOutDevice } = await import("./deviceWipe");
    await wipeSignedOutDevice(async () => { events.push("signout"); });
    expect(events).toEqual(["push-off", "signout", "purge", "wipe", "pin"]);
  });

  it("does not wipe when sign-out fails, and push was already attempted first", async () => {
    const { wipeSignedOutDevice } = await import("./deviceWipe");
    await expect(wipeSignedOutDevice(async () => { throw new TypeError("offline"); })).rejects.toThrow("No pudimos completar");
    expect(events).toEqual(["push-off", "resume"]);
  });
});
