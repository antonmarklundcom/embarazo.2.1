// BUILD-PLAN A3 — the last-write-wins rule, in one pure, testable place.
//
// Everything here is deliberately free of Dexie, of `fetch` and of the server.
// The sync engine is the part of this app most likely to lose someone's data,
// so the decisions it makes are separated from the machinery that carries them
// out and covered by unit tests (`merge.test.ts`).
//
// The contract, stated once (DECISIONS.md carries the same words):
//
//   * Every synced row carries `uid` (stable across devices), `updatedAt`
//     (epoch ms, client-authored), `deletedAt` (soft delete) and `dirty`.
//   * A record is compared ONLY by `updatedAt`. Strictly greater wins.
//     An exact tie keeps the local copy — ties are almost always the same
//     write coming back, and preferring local avoids a pointless rewrite.
//   * Deletion is not special. A delete is a row with `deletedAt` set and its
//     own `updatedAt`, so an edit made after a delete resurrects the record.
//     That is what last-write-wins means, and pretending otherwise ("deletes
//     always win") loses edits silently.
//   * Losing a journal note is the one case where silence would hurt, so the
//     loser is kept as a `conflicts` row and surfaced. Nothing else conflicts.

import type { SyncedStore } from "./stores";

/** Fields the sync engine owns on every synced Dexie row. */
export interface SyncMeta {
  /** Stable across devices. NOT Dexie's `++id`, which is per-device. */
  uid: string;
  /** Epoch ms of the last local write. The only thing LWW compares. */
  updatedAt: number;
  /** Soft delete. Set instead of removing the row so the delete propagates. */
  deletedAt?: number | null;
  /** 1 when the row has local changes the server has not accepted yet. */
  dirty?: number;
}

export type LocalRow = SyncMeta & {
  id?: number;
  [key: string]: unknown;
};

/** The wire shape of one record, both directions. */
export interface SyncEnvelope {
  store: SyncedStore;
  recordId: string;
  updatedAt: number;
  deletedAt: number | null;
  /** Opaque to the server (ARCHITECTURE.md §4.3). Null for deleted records. */
  payload: Record<string, unknown> | null;
}

/** Local-only bookkeeping fields that must never reach the payload. */
export const SYNC_META_FIELDS = [
  "id",
  "uid",
  "updatedAt",
  "deletedAt",
  "dirty",
] as const;

/**
 * Marker written into a journal payload whose note is PIN-encrypted.
 *
 * Encrypted notes are NOT synced. The key is derived from a PIN plus a
 * device-local salt, so shipping the ciphertext to a second device produces
 * something that device can never open (this is the hole the August review
 * found in backup, `docs/OPUS-REVIEW-2026-08.md` §3.2, and it would have
 * followed us into sync). Uploading the salt as well would hand the server
 * both halves of a 4-digit secret, which is worse than not syncing.
 *
 * So the record syncs — week, mood, symptoms, timestamps — and the note text
 * stays on the device that wrote it, with this flag saying so out loud.
 */
export const WITHHELD_NOTE = "noteWithheld";

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * The body to send for a local row: everything except sync bookkeeping and
 * Dexie's per-device autoincrement id.
 *
 * A deleted record sends no payload at all. There is no reason for the server
 * to hold the contents of a symptom log the user just deleted.
 */
export function toPayload(
  store: SyncedStore,
  row: LocalRow,
): Record<string, unknown> | null {
  if (row.deletedAt) return null;

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if ((SYNC_META_FIELDS as readonly string[]).includes(key)) continue;
    if (value === undefined) continue;
    payload[key] = value;
  }

  if (store === "journalEntries" && payload.noteEncrypted === true) {
    delete payload.note;
    payload[WITHHELD_NOTE] = true;
  }

  return payload;
}

/**
 * Build the local row to write from an incoming envelope.
 *
 * `local` is the row already on this device, if any. It matters for exactly
 * one thing: a payload whose note was withheld must never blank out a note
 * this device still holds. Otherwise device B, which received a withheld
 * record and then touched it, would push the emptiness back and destroy the
 * note on device A.
 */
export function applyPayload(
  store: SyncedStore,
  incoming: SyncEnvelope,
  local: LocalRow | undefined,
): LocalRow {
  const row: LocalRow = {
    ...(incoming.payload ?? {}),
    uid: incoming.recordId,
    updatedAt: incoming.updatedAt,
    deletedAt: incoming.deletedAt ?? null,
    // Applying a remote record is not a local change.
    dirty: 0,
  };

  // Keep Dexie's primary key so this is an update, not a duplicate insert.
  if (local?.id !== undefined) row.id = local.id;

  if (store === "journalEntries" && incoming.payload?.[WITHHELD_NOTE] === true) {
    const localNote = local?.note;
    if (typeof localNote === "string" && localNote.length > 0) {
      row.note = localNote;
      row.noteEncrypted = local?.noteEncrypted ?? true;
      delete row[WITHHELD_NOTE];
    } else {
      // Nothing to preserve — keep the marker so the UI can explain the gap.
      row.note = "";
    }
  }

  return row;
}

// ---------------------------------------------------------------------------
// Last-write-wins
// ---------------------------------------------------------------------------

export type MergeReason =
  | "insert"
  | "remote-newer"
  | "local-newer"
  | "same-timestamp";

export interface ConflictDraft {
  store: SyncedStore;
  recordId: string;
  /** The local version that lost, kept verbatim so nothing is destroyed. */
  localPayload: Record<string, unknown> | null;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export interface MergeResult {
  /** True when the incoming record should be written over the local one. */
  apply: boolean;
  reason: MergeReason;
  /** Present when `apply` is true. */
  row: LocalRow | null;
  /** Present only when a dirty journal note lost. Never dropped silently. */
  conflict: ConflictDraft | null;
}

/**
 * Decide what to do with one incoming record.
 *
 * `now` is only used to stamp a conflict; the comparison itself never looks at
 * the clock, because two devices' clocks disagree and the record's own
 * `updatedAt` is the only ordering we have.
 */
export function mergeIncoming(
  store: SyncedStore,
  incoming: SyncEnvelope,
  local: LocalRow | undefined,
): MergeResult {
  if (!local) {
    return {
      apply: true,
      reason: "insert",
      row: applyPayload(store, incoming, undefined),
      conflict: null,
    };
  }

  if (incoming.updatedAt < local.updatedAt) {
    return { apply: false, reason: "local-newer", row: null, conflict: null };
  }
  if (incoming.updatedAt === local.updatedAt) {
    return { apply: false, reason: "same-timestamp", row: null, conflict: null };
  }

  return {
    apply: true,
    reason: "remote-newer",
    row: applyPayload(store, incoming, local),
    conflict: conflictFor(store, incoming, local),
  };
}

/**
 * A conflict is raised when a journal note this device holds is about to be
 * replaced by different text. Nothing else conflicts — a kick count that lost
 * by 40ms is not worth a banner, and a note is the one thing a user writes in
 * their own words and would mourn.
 *
 * Note the test this does NOT apply: `dirty`. The obvious rule — "conflict
 * only if we had unpushed changes" — misses the common case. Device A writes
 * a note and syncs (clean); device B, still holding yesterday's version,
 * writes its own and syncs later; B wins on timestamp and A's text disappears
 * with A never having been dirty at the moment of the overwrite. Only the
 * server could tell those two apart, and only by keeping a shadow copy of the
 * note, which §4.3 rules out. So the rule is the one the device can actually
 * evaluate: if a note is being replaced by different text, say so.
 *
 * This can over-trigger — the same person editing the same note on two
 * devices sees a banner. That is the right way to be wrong here.
 */
function conflictFor(
  store: SyncedStore,
  incoming: SyncEnvelope,
  local: LocalRow,
): ConflictDraft | null {
  if (store !== "journalEntries") return null;

  const localNote = typeof local.note === "string" ? local.note : "";
  const remoteNote =
    typeof incoming.payload?.note === "string" ? incoming.payload.note : "";

  // A withheld note carries no text to compare against, and the local note is
  // preserved rather than overwritten (see applyPayload), so nothing is lost.
  if (incoming.payload?.[WITHHELD_NOTE] === true) return null;
  if (localNote === remoteNote) return null;
  if (localNote.length === 0) return null;

  return {
    store,
    recordId: incoming.recordId,
    localPayload: toPayload(store, local),
    localUpdatedAt: local.updatedAt,
    remoteUpdatedAt: incoming.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Server-side comparison
// ---------------------------------------------------------------------------

/**
 * The same rule, from the server's side of the wire. Kept here rather than in
 * `lib/server/sync.ts` so both ends demonstrably use one implementation — a
 * client and a server that disagree about who won is how sync loops forever.
 */
export function serverAccepts(
  incomingUpdatedAt: number,
  storedUpdatedAt: number | undefined,
): boolean {
  if (storedUpdatedAt === undefined) return true;
  return incomingUpdatedAt > storedUpdatedAt;
}
