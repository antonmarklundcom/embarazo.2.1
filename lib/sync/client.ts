// BUILD-PLAN A3 — the device half of sync.
//
// Everything here is best-effort by design. Sync is a background
// reconciliation, never a precondition for using the app (ARCHITECTURE.md
// §4.1): if it 401s, 404s, times out or the user has no account at all, the
// app carries on against IndexedDB exactly as it did before A3. That is the
// non-negotiable, and it is why every entry point below swallows its errors
// into `syncState.lastError` rather than throwing at a caller.

import { db, type ConflictRow } from "@/lib/db";
import {
  mergeIncoming,
  toPayload,
  type LocalRow,
  type SyncEnvelope,
} from "./merge";
import {
  MAX_PUSH_RECORDS,
  type PullResponse,
  type PushResponse,
  type SyncRecordInput,
} from "./protocol";
import { onLocalChange } from "./signal";
import { SYNCED_STORES, type SyncedStore } from "./stores";

const SYNC_URL = "/api/v1/sync";
/** Wait this long after a local edit before pushing, so typing is not chatty. */
const DEBOUNCE_MS = 3_000;

export type SyncOutcome =
  | "ok"
  | "unavailable"
  | "offline"
  | "busy"
  | "error";

export interface SyncSummary {
  outcome: SyncOutcome;
  pushed: number;
  pulled: number;
  conflicts: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let running = false;
/**
 * Set when the server tells us sync is not for this visitor — no session, or
 * no account system configured at all. Sticky for the page load: there is no
 * point re-asking every three seconds, and a sign-in navigates the page.
 */
let unavailable = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

async function readSyncState(): Promise<number> {
  const row = await db().syncState.get("default");
  return row?.lastPulledAt ?? 0;
}

async function writeSyncState(patch: {
  lastPulledAt?: number;
  lastSyncAt?: number;
  lastError?: string;
}): Promise<void> {
  const current = await db().syncState.get("default");
  await db().syncState.put({
    key: "default",
    lastPulledAt: patch.lastPulledAt ?? current?.lastPulledAt ?? 0,
    lastSyncAt: patch.lastSyncAt ?? current?.lastSyncAt,
    lastError: patch.lastError,
  });
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function collectDirty(): Promise<
  { store: SyncedStore; row: LocalRow }[]
> {
  const out: { store: SyncedStore; row: LocalRow }[] = [];
  for (const store of SYNCED_STORES) {
    const rows = (await db()
      .table(store)
      .where("dirty")
      .equals(1)
      .toArray()) as LocalRow[];
    for (const row of rows) out.push({ store, row });
  }
  return out;
}

function toEnvelope(store: SyncedStore, row: LocalRow): SyncRecordInput {
  return {
    store,
    recordId: row.uid,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
    payload: toPayload(store, row),
  };
}

/**
 * Clear `dirty` on a row we successfully pushed — but only if it has not been
 * touched since. Comparing `updatedAt` is what stops an edit made *during* the
 * request from being marked clean and never uploaded.
 */
async function markClean(
  store: SyncedStore,
  recordId: string,
  pushedUpdatedAt: number,
): Promise<void> {
  const table = db().table(store);
  const row = (await table.where("uid").equals(recordId).first()) as
    | LocalRow
    | undefined;
  if (!row || row.id === undefined) return;
  if (row.updatedAt !== pushedUpdatedAt) return;
  // Pass `updatedAt` explicitly so the stamping hook leaves it alone; this is
  // bookkeeping, not a user edit.
  await table.update(row.id, { dirty: 0, updatedAt: row.updatedAt });
}

async function push(): Promise<number> {
  const dirty = await collectDirty();
  if (dirty.length === 0) return 0;

  let pushed = 0;
  for (let i = 0; i < dirty.length; i += MAX_PUSH_RECORDS) {
    const batch = dirty.slice(i, i + MAX_PUSH_RECORDS);
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: batch.map(({ store, row }) => toEnvelope(store, row)),
      }),
    });
    if (!res.ok) throw httpError(res.status);

    const body = (await res.json()) as PushResponse;
    const sent = new Map(
      batch.map(({ store, row }) => [`${store} ${row.uid}`, row.updatedAt]),
    );

    for (const result of body.results) {
      // `stale` clears the flag too: the server holds something newer, the
      // pull below brings it, and re-pushing a loser forever is how a sync
      // engine burns a phone's battery.
      if (result.outcome === "rejected") continue;
      const updatedAt = sent.get(`${result.store} ${result.recordId}`);
      if (updatedAt === undefined) continue;
      await markClean(result.store as SyncedStore, result.recordId, updatedAt);
      pushed += 1;
    }
  }
  return pushed;
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

async function applyIncoming(
  incoming: SyncEnvelope,
): Promise<{ applied: boolean; conflict: boolean }> {
  const store = incoming.store;
  const table = db().table(store);

  const local = (await table.where("uid").equals(incoming.recordId).first()) as
    | LocalRow
    | undefined;

  const merged = mergeIncoming(store, incoming, local);
  if (!merged.apply || !merged.row) {
    return { applied: false, conflict: false };
  }

  if (merged.conflict) {
    const conflict: ConflictRow = {
      store: merged.conflict.store,
      recordId: merged.conflict.recordId,
      detectedAt: Date.now(),
      localUpdatedAt: merged.conflict.localUpdatedAt,
      remoteUpdatedAt: merged.conflict.remoteUpdatedAt,
      localPayload: merged.conflict.localPayload,
      resolved: 0,
    };
    await db().conflicts.add(conflict);
  }

  // `put` carries dirty: 0 and the remote `updatedAt` explicitly, so the
  // stamping hooks in lib/db.ts leave both alone — applying a remote record is
  // not a local change and must not become one.
  await table.put(merged.row as never);

  return { applied: true, conflict: merged.conflict !== null };
}

async function pull(): Promise<{ pulled: number; conflicts: number }> {
  const since = await readSyncState();
  let cursor: string | undefined;
  let pulled = 0;
  let conflicts = 0;
  // Advances only to the highest `serverUpdatedAt` actually received. Not to
  // `serverTime`: a record written by a phone that was offline carries an old
  // client `updatedAt` but a fresh server one, and a cursor set from the wall
  // clock would step over records that arrive out of client-clock order.
  let highWater = since;

  // Bounded so a server that keeps handing back a cursor cannot spin forever.
  for (let page = 0; page < 50; page += 1) {
    const url = new URL(SYNC_URL, window.location.origin);
    url.searchParams.set("since", String(since));
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) throw httpError(res.status);

    const body = (await res.json()) as PullResponse;

    for (const record of body.records) {
      highWater = Math.max(highWater, record.serverUpdatedAt);
      const result = await applyIncoming({
        store: record.store,
        recordId: record.recordId,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt ?? null,
        payload: record.payload ?? null,
      });
      if (result.applied) pulled += 1;
      if (result.conflict) conflicts += 1;
    }

    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }

  await writeSyncState({ lastPulledAt: highWater, lastSyncAt: Date.now() });
  return { pulled, conflicts };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

class SyncHttpError extends Error {
  constructor(readonly status: number) {
    super(`sync http ${status}`);
  }
}

function httpError(status: number): SyncHttpError {
  return new SyncHttpError(status);
}

/**
 * Push then pull, once.
 *
 * Push first, deliberately: local changes reach the server before the pull can
 * overwrite them, so a record edited offline wins against the older copy the
 * server still holds rather than losing to it.
 */
export async function syncNow(): Promise<SyncSummary> {
  const idle: SyncSummary = {
    outcome: "ok",
    pushed: 0,
    pulled: 0,
    conflicts: 0,
  };

  if (typeof window === "undefined") return { ...idle, outcome: "unavailable" };
  if (unavailable) return { ...idle, outcome: "unavailable" };
  if (running) return { ...idle, outcome: "busy" };
  if (navigator.onLine === false) return { ...idle, outcome: "offline" };

  running = true;
  try {
    const pushed = await push();
    const { pulled, conflicts } = await pull();
    return { outcome: "ok", pushed, pulled, conflicts };
  } catch (err) {
    if (err instanceof SyncHttpError && (err.status === 401 || err.status === 404)) {
      // No session, or no account system in this deployment. Both are normal
      // ("seguir sin cuenta"), not failures worth showing anybody.
      unavailable = true;
      return { ...idle, outcome: "unavailable" };
    }
    await writeSyncState({
      lastError: err instanceof Error ? err.message : "error de sincronización",
    }).catch(() => {});
    return { ...idle, outcome: "error" };
  } finally {
    running = false;
  }
}

/** Sync after a quiet moment. Called on every local write. */
export function scheduleSync(delay: number = DEBOUNCE_MS): void {
  if (typeof window === "undefined" || unavailable) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void syncNow();
  }, delay);
}

/**
 * Wire up the triggers: app open, reconnect, and debounced after a mutation
 * (ARCHITECTURE.md §5). Returns a teardown so React can call it in an effect
 * without leaking listeners in development's double-mount.
 */
export function startSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  const onOnline = () => void syncNow();
  window.addEventListener("online", onOnline);
  const stopListening = onLocalChange(() => scheduleSync());

  void syncNow();

  return () => {
    started = false;
    window.removeEventListener("online", onOnline);
    stopListening();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ---------------------------------------------------------------------------
// Conflicts (surfaced, never dropped)
// ---------------------------------------------------------------------------

export async function unresolvedConflicts(): Promise<ConflictRow[]> {
  return db().conflicts.where("resolved").equals(0).toArray();
}

/** Dismiss a conflict, keeping the version that won. */
export async function discardConflict(id: number): Promise<void> {
  await db().conflicts.update(id, { resolved: 1 });
}

/**
 * Restore the losing version as the current one.
 *
 * Written as a normal local edit — a fresh `updatedAt`, `dirty = 1` — so the
 * restore itself wins the next comparison and propagates to the other device.
 */
export async function restoreConflict(id: number): Promise<void> {
  const conflict = await db().conflicts.get(id);
  if (!conflict || !conflict.localPayload) return;

  const table = db().table(conflict.store);
  const row = (await table.where("uid").equals(conflict.recordId).first()) as
    | LocalRow
    | undefined;
  if (row?.id !== undefined) {
    await table.update(row.id, { ...conflict.localPayload });
  }
  await db().conflicts.update(id, { resolved: 1 });
  scheduleSync(0);
}

/** Test seam: forget that the server said "not for you". */
export function resetSyncAvailability(): void {
  unavailable = false;
}
