"use client";

import { db } from "@/lib/db";
import { siteParamsToAnswers } from "@/lib/onboarding/siteParams";
import { preserveLegacyPhotoDeletionOwner } from "@/lib/sync/photoDeletions";
import { safeReturnTo } from "./access";

export const VERIFIED_KEY = "mibebe.auth.offline.v1";
const HANDOFF_KEY = "mibebe.auth.handoff.v1";
export const ACCESS_REVOKED_EVENT = "mibebe:account-access-revoked";
const OFFLINE_WINDOW = 7 * 24 * 60 * 60 * 1000;
const HANDOFF_WINDOW = 60 * 60 * 1000;

export function clearOfflineAccess(): void {
  try { localStorage.removeItem(VERIFIED_KEY); } catch { /* Storage unavailable. */ }
  // A tab does not receive its own storage event: hide private screens during sign-out.
  try { window.dispatchEvent(new Event(ACCESS_REVOKED_EVENT)); } catch { /* No window. */ }
}

/** Bind before showing personal records, even when the first sync is delayed. */
export async function bindVerifiedDeviceAccount(accountId: string): Promise<boolean> {
  const instance = db();
  return instance.transaction("rw", instance.syncState, async () => {
    const current = await instance.syncState.get("default");
    if (current?.accountId && current.accountId !== accountId) return false;
    if (!current?.accountId) {
      preserveLegacyPhotoDeletionOwner(undefined);
      await instance.syncState.put({ key: "default", lastPulledAt: 0, ...current, accountId });
    }
    return true;
  });
}

export function rememberVerifiedAccount(accountId: string): void {
  try { localStorage.setItem(VERIFIED_KEY, JSON.stringify({ accountId, at: Date.now() })); } catch { /* Online use still works. */ }
}

/** Offline access is to this account's existing local records, never a new signup. */
export async function verifiedOfflineAccountId(): Promise<string | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(VERIFIED_KEY) ?? "null") as { accountId?: unknown; at?: unknown } | null;
    if (!cached || typeof cached.accountId !== "string" || !cached.accountId || typeof cached.at !== "number" || !Number.isFinite(cached.at) || cached.at > Date.now() || Date.now() - cached.at > OFFLINE_WINDOW) return null;
    const link = await db().syncState.get("default");
    return link?.accountId === cached.accountId ? cached.accountId : null;
  } catch { return null; }
}

export type AuthHandoff = { patch: ReturnType<typeof siteParamsToAnswers>; returnTo: string };

/** Calculator fields can prefill values, never onboarding's step or saved flag. */
function handoffPatch(raw: unknown): AuthHandoff["patch"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const params = new URLSearchParams();
  if (value.mode === "planeando") params.set("modo", "planeando");
  if (value.method === "lmp" && typeof value.lmp === "string") params.set("fum", value.lmp);
  if (value.method === "ecografia" && typeof value.dueDateInput === "string") params.set("fpp", value.dueDateInput);
  return siteParamsToAnswers(params.toString());
}

/** Save chosen calculator data locally before the OAuth redirect, not in a URL. */
export function rememberHandoff(destination?: string): string {
  const patch = siteParamsToAnswers(window.location.search, Date.now(), window.location.hash);
  const returnTo = safeReturnTo(destination ?? window.location.pathname + window.location.search);
  const previous = readHandoff();
  try { localStorage.setItem(HANDOFF_KEY, JSON.stringify({ patch: patch ?? previous?.patch ?? null, returnTo, at: Date.now() })); } catch { /* User can re-enter dates. */ }
  return returnTo;
}

export function readHandoff(): AuthHandoff | null {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw || raw.length > 4000) return null;
    const value = JSON.parse(raw) as { patch?: unknown; returnTo?: unknown; at?: unknown } | null;
    if (!value || typeof value.at !== "number" || !Number.isFinite(value.at) || value.at > Date.now() || Date.now() - value.at > HANDOFF_WINDOW) return null;
    return { patch: handoffPatch(value.patch), returnTo: safeReturnTo(value.returnTo) };
  } catch { return null; }
}

export function clearHandoff(): void {
  try { localStorage.removeItem(HANDOFF_KEY); } catch { /* No persistent storage. */ }
}

/** Call after onboarding is complete (or an existing profile was restored). */
export function completeHandoff(): boolean {
  const handoff = readHandoff();
  clearHandoff();
  if (!handoff || handoff.returnTo === "/") return false;
  const current = safeReturnTo(window.location.pathname + window.location.search);
  if (current === handoff.returnTo) return false;
  window.location.replace(handoff.returnTo);
  return true;
}

export async function mayUseOfflineRecords(): Promise<boolean> {
  return (await verifiedOfflineAccountId()) !== null;
}