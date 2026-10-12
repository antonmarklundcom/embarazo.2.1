import { forgetDeletedAccountPhotoJobs } from "./photoDeletions";
import { db, wipeAllData } from "@/lib/db";
import { clearPin } from "@/lib/crypto";
import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { AUTH_STATUS_PATH } from "@/lib/auth/status";
import { purgePrivateCaches } from "@/lib/sw/privateCaches";
import { pauseSyncForDeviceWipe, resumeSyncAfterFailedWipe } from "./client";
import { pausePhotoSyncForDeviceWipe, resumePhotoSyncAfterFailedWipe } from "@/lib/photos/client";

export class AccountDeletionError extends Error {}
export interface AccountDeletionResult { deviceWiped: boolean; cleanupFailed: boolean; }
/** The cloud operation completes before anything can revoke/unmount its form. */
export async function deleteSignedInAccount(
  remove: (expectedAccountId: string) => Promise<{ deleted?: boolean; error?: string }>,
  wipeDevice: boolean,
): Promise<AccountDeletionResult> {
  await Promise.all([pauseSyncForDeviceWipe(), pausePhotoSyncForDeviceWipe()]);
  let deleted = false;
  try {
    const before = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!before.ok) throw new AccountDeletionError("No pudimos verificar tu cuenta. Conectate y probá de nuevo.");
    const status = await before.json();
    const owner = (await db().syncState.get("default"))?.accountId;
    if (status?.signedIn !== true || typeof status.accountId !== "string" || !status.accountId || (owner && owner !== status.accountId)) {
      throw new AccountDeletionError("Tu sesión o cuenta cambió. Entrá con la cuenta de estos registros antes de borrarla.");
    }
    const result = await remove(status.accountId);
    if (result.deleted !== true) throw new AccountDeletionError(result.error || "No pudimos confirmar el borrado. Tus datos locales siguen guardados.");
    deleted = true;
    // The server acknowledges deletion independently of whether its cookie POST
    // succeeded. Do not wipe the phone on an unconfirmed live session.
    const after = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!after.ok || (await after.json())?.signedIn !== false) {
      await purgePrivateCaches();
      return { deviceWiped: false, cleanupFailed: true };
    }
    let deviceWiped = false;
    try {
      if (wipeDevice) {
        await wipeAllData({ expectedAccountId: status.accountId });
        clearPin();
        clearOnboardingDraft();
        deviceWiped = true;
      }
      forgetDeletedAccountPhotoJobs(status.accountId);
      await purgePrivateCaches();
      return { deviceWiped, cleanupFailed: false };
    } catch {
      await purgePrivateCaches();
      return { deviceWiped, cleanupFailed: true };
    }
  } catch (error) {
    if (deleted) {
      await purgePrivateCaches();
      return { deviceWiped: false, cleanupFailed: true };
    }
    if (error instanceof AccountDeletionError) throw error;
    throw new AccountDeletionError("No pudimos confirmar el borrado. Tus datos locales siguen guardados. Conectate y probá de nuevo.");
  } finally {
    if (!deleted) { resumeSyncAfterFailedWipe(); resumePhotoSyncAfterFailedWipe(); }
  }
}
