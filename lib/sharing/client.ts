"use client";

import { db, notDeleted } from "@/lib/db";
import { getCurrentWeek } from "@/lib/pregnancy";
import { buildSnapshot, type CompanionSnapshot, type MemberRole } from "./fields";

// BUILD-PLAN E1 — the owner's device is what publishes the companion view.
//
// The server cannot compute any of this: the week comes from an LMP that lives
// inside `syncRecords.payload`, which it never reads (§4.3). So the owner's
// device builds the snapshot and posts it, and that post is the only way any
// of these four values ever reaches the server in legible form.

const URL_PATH = "/api/v1/sharing";

export interface SharedView {
  pregnancyId: string;
  role: MemberRole;
  snapshot: CompanionSnapshot | null;
  members?: { userId: string; role: MemberRole; createdAt: string }[];
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

    const res = await fetch(URL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", ...withoutUpdatedAt(snapshot) }),
    });
    return res.ok;
  } catch {
    // No account, offline, or sharing not configured. All ordinary.
    return false;
  }
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
