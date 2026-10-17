import { db, wipeAllData } from "@/lib/db";
import { clearPin } from "@/lib/crypto";
import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { purgePrivateCaches } from "@/lib/sw/privateCaches";
import { AUTH_STATUS_PATH } from "@/lib/auth/status";
import { endPushForSignOut } from "@/lib/push/client";
import { pauseSyncForDeviceWipe, resumeSyncAfterFailedWipe } from "./client";
import { pausePhotoSyncForDeviceWipe, resumePhotoSyncAfterFailedWipe } from "@/lib/photos/client";

/** End writers and confirm sign-out before deleting the phone's only copies. */
export async function wipeSignedOutDevice(signOut: () => Promise<unknown>): Promise<void> {
  const expectedAccountId = (await db().syncState.get("default"))?.accountId;
  await Promise.all([pauseSyncForDeviceWipe(), pausePhotoSyncForDeviceWipe()]);
  try {
    if (expectedAccountId) {
      const before = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
      if (!before.ok) throw new Error("session-not-verified");
      const current = await before.json();
      if (current?.signedIn !== false && (current?.signedIn !== true || current.accountId !== expectedAccountId)) throw new Error("account-changed");
    }
    // Privacy: end this phone's push subscription (browser and server row)
    // while the session cookie still authorises the DELETE, and before any
    // local data goes. Otherwise the server keeps poking this phone at the
    // previous account's reminder times. Bounded and never throws, so a slow
    // network cannot hold the wipe.
    await endPushForSignOut();
    await signOut();
    // Auth.js's redirect:false response alone does not prove its POST worked.
    // Do not use fetchAuthStatus here: it treats a network error as signed out.
    const response = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!response.ok || (await response.json())?.signedIn !== false) {
      throw new Error("session-not-ended");
    }
    await purgePrivateCaches();
    await wipeAllData({ expectedAccountId });
    clearPin();
    clearOnboardingDraft();
    // Keep coordinators stopped until the caller's full-page navigation.
  } catch {
    resumeSyncAfterFailedWipe();
    resumePhotoSyncAfterFailedWipe();
    throw new Error(
      "No pudimos completar el borrado de este teléfono. No borramos tus datos si no pudimos confirmar el cierre de sesión. Conectate a internet y probá de nuevo.",
    );
  }
}
