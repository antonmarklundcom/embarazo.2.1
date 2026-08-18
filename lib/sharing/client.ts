"use client";

import { db, notDeleted } from "@/lib/db";
import { getCurrentWeek } from "@/lib/pregnancy";
import {
  buildSnapshot,
  type CompanionSnapshot,
  type MemberRole,
  type SharedTask,
} from "./fields";
import type { CheerId } from "./cheers";
import {
  SHARING_DEFAULTS,
  applyLevels,
  emptyExtras,
  parsePreferences,
  type SharedExtras,
  type SharingPreferences,
} from "./levels";

// BUILD-PLAN E1 — the owner's device is what publishes the companion view.
//
// The server cannot compute any of this: the week comes from an LMP that lives
// inside `syncRecords.payload`, which it never reads (§4.3). So the owner's
// device builds the snapshot and posts it, and that post is the only way any
// of these four values ever reaches the server in legible form.

const URL_PATH = "/api/v1/sharing";

export interface ReceivedCheer {
  cheerId: string;
  createdAt: number;
  seenAt: number | null;
}

export interface SharedView {
  pregnancyId: string;
  role: MemberRole;
  snapshot: CompanionSnapshot | null;
  members?: {
    userId: string;
    role: MemberRole;
    createdAt: string;
    /** K8 — the control this member said they would come to, if any. */
    accompanyingAt: number | null;
  }[];
  /** K8 — the caller's own "yo la acompaño" marker. Null on an owner view. */
  accompanyingAt?: number | null;
  /**
   * K2. Absent for a `family` member, and absent is not the same as empty: the
   * server declines to say whether anything is assigned, rather than saying
   * "nothing is".
   */
  tasks?: SharedTask[];
  /** K2. The owner's own inbox of ánimos; never present on a companion view. */
  cheers?: ReceivedCheer[];
  /**
   * K3. Present only on a `partner` view, and each field is null unless the
   * owner turned that level on. The server decides both — see
   * `readSnapshotFor`.
   */
  extras?: SharedExtras;
}

/**
 * Build the snapshot from local data and send it.
 *
 * Reads only the four fields it publishes. It deliberately does not take a
 * whole profile and pick fields out of it — the call site cannot accidentally
 * widen what gets sent, because there is nothing wider in scope.
 */
export async function publishCompanionSnapshot(): Promise<boolean> {
  try {
    const profile = notDeleted(await db().profile.toArray())[0];
    const pregnancy = notDeleted(await db().pregnancy.toArray())[0];

    const snapshot = buildSnapshot({
      week: pregnancy?.lmpDate ? getCurrentWeek(pregnancy.lmpDate) : null,
      dueDate: pregnancy?.dueDate ?? null,
      nextAppointmentAt: profile?.nextAppointment ?? null,
      babyName: firstBabyName(profile),
      now: Date.now(),
    });

    // K3. The device applies the levels too, so a value whose level is off
    // never leaves the phone in the first place. The server applies them again
    // on the way in — the two are the same pure function, and neither trusts
    // the other.
    const preferences = parsePreferences(profile?.sharing);
    const extras = applyLevels(preferences, await readShareableExtras());

    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        ...withoutUpdatedAt(snapshot),
        sharing: preferences,
        extras,
      }),
    });
    return res.ok;
  } catch {
    // No account, offline, or sharing not configured. All ordinary.
    return false;
  }
}

/**
 * The values the levels can unlock, read from the device.
 *
 * Reads exactly the two stores K3 shares and nothing else, for the same reason
 * `buildSnapshot` takes plain values rather than a profile: there is no wider
 * object in scope for a call site to accidentally spread.
 */
async function readShareableExtras(): Promise<SharedExtras> {
  const extras = emptyExtras();

  const weights = notDeleted(await db().weightEntries.toArray()).sort(
    (a, b) => b.date - a.date,
  );
  const latestWeight = weights[0];
  if (latestWeight) {
    extras.weightGrams = Math.round(latestWeight.kg * 1000);
    extras.weightAt = latestWeight.date;
  }

  // Only a finished session: a counter that is still running is not a number
  // she has decided to stand behind.
  const kicks = notDeleted(await db().kickSessions.toArray())
    .filter((session) => session.completedAt)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const latestKicks = kicks[0];
  if (latestKicks) {
    extras.kickCount = latestKicks.count;
    extras.kickAt = latestKicks.completedAt ?? latestKicks.startedAt;
  }

  return extras;
}

/** Read the owner's stored levels off her profile row. */
export async function readSharingPreferences(): Promise<SharingPreferences> {
  try {
    const profile = notDeleted(await db().profile.toArray())[0];
    return parsePreferences(profile?.sharing);
  } catch {
    return { ...SHARING_DEFAULTS };
  }
}

/**
 * Store the levels and publish immediately.
 *
 * Publishing in the same call is what makes "turning one off removes it from
 * the partner view" true now rather than at the next app open. If the publish
 * fails (offline), the *flag* is already stored on the server from the last
 * successful publish or, failing that, the read path still obeys whatever flag
 * the server holds — and the next publish reconciles both.
 */
export async function saveSharingPreferences(
  preferences: SharingPreferences,
): Promise<boolean> {
  const rows = await db().profile.toArray();
  const first = rows[0];
  if (!first?.id) return false;
  await db().profile.update(first.id, { sharing: { ...preferences } });
  return publishCompanionSnapshot();
}

/** `updatedAt` is stamped by the server; sending it would be a 400. */
function withoutUpdatedAt(snapshot: CompanionSnapshot) {
  return {
    week: snapshot.week,
    dueDate: snapshot.dueDate,
    nextAppointmentAt: snapshot.nextAppointmentAt,
    babyName: snapshot.babyName,
  };
}

function firstBabyName(profile: { babies?: unknown } | undefined): string | null {
  const babies = profile?.babies;
  if (!Array.isArray(babies)) return null;
  const first = babies[0] as { name?: unknown } | undefined;
  return typeof first?.name === "string" ? first.name : null;
}

export async function fetchSharedViews(): Promise<SharedView[]> {
  try {
    const res = await fetch(URL_PATH);
    if (!res.ok) return [];
    const body = (await res.json()) as { views: SharedView[] };
    return body.views ?? [];
  } catch {
    return [];
  }
}

export async function createInviteCode(
  role: "partner" | "family",
): Promise<{ code: string; expiresAt: string } | null> {
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", role }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { code: string; expiresAt: string };
  } catch {
    return null;
  }
}

export async function acceptInviteCode(
  code: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", code }),
    });
    return (await res.json()) as { ok: boolean; reason?: string };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

export async function revokeMember(
  pregnancyId: string,
  userId: string,
): Promise<boolean> {
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke-member", pregnancyId, userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// K2 — shared checklist items and ánimos
// ---------------------------------------------------------------------------

/**
 * Every call below returns a boolean rather than throwing, like the E1 calls
 * above it. A companion is on a phone in Paraguay: offline is the normal case,
 * not the error case, and the UI reverts its optimistic state instead of
 * showing a stack trace.
 */
async function post(body: unknown): Promise<boolean> {
  try {
    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Owner: put a checklist item on the pareja's list. */
export function assignTaskToPartner(itemKey: string): Promise<boolean> {
  return post({ action: "assign-task", itemKey });
}

/** Owner: take it back off. */
export function unassignTaskFromPartner(itemKey: string): Promise<boolean> {
  return post({ action: "unassign-task", itemKey });
}

/** Partner: tick or un-tick an item the owner assigned. */
export function setSharedTaskDone(
  pregnancyId: string,
  itemKey: string,
  done: boolean,
): Promise<boolean> {
  return post({ action: "complete-task", pregnancyId, itemKey, done });
}

/** Companion: send one ánimo. */
export function sendCheer(
  pregnancyId: string,
  cheerId: CheerId,
): Promise<boolean> {
  return post({ action: "cheer", pregnancyId, cheerId });
}

/** Owner: acknowledge everything currently in the inbox. */
export function markCheersSeen(): Promise<boolean> {
  return post({ action: "cheers-seen" });
}

/**
 * K8 — companion: say you will be at this control, or take it back.
 *
 * The timestamp is the control being agreed to, not "the next one": if it
 * moves, the stored marker stops matching and everybody involved is told
 * nothing rather than something wrong.
 */
export function setAccompanying(
  pregnancyId: string,
  appointmentAt: number | null,
): Promise<boolean> {
  return post({ action: "accompany", pregnancyId, appointmentAt });
}
