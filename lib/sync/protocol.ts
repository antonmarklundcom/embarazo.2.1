// BUILD-PLAN A3 — the wire contract for /api/v1/sync.
//
// Shared by the route handler and the client engine so there is exactly one
// definition of what a sync request looks like. Standing rule 4: new API
// surface gets a zod whitelist and tests, and `.strict()` here means an
// unexpected field is a 400 rather than something quietly stored.

import { z } from "zod";
import { SYNCED_STORES } from "./stores";

/** Records accepted in a single push. Keeps one request bounded. */
export const MAX_PUSH_RECORDS = 200;
/** Records returned by a single pull page. */
export const DEFAULT_PULL_LIMIT = 500;
export const MAX_PULL_LIMIT = 1000;
/** Serialised payload cap, per record. Generous for text, hostile to blobs. */
export const MAX_PAYLOAD_BYTES = 64 * 1024;

/**
 * How far into the future a client-authored `updatedAt` may be.
 *
 * `updatedAt` comes from the device clock, and a device whose clock is a year
 * fast would win every last-write-wins comparison forever — including against
 * writes the user makes afterwards on a correct device. Rejecting the record
 * is better than silently accepting a poisoned timestamp.
 */
export const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

const timestampSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const SyncRecordSchema = z
  .object({
    store: z.enum(SYNCED_STORES),
    recordId: z.string().min(1).max(128),
    updatedAt: timestampSchema,
    deletedAt: timestampSchema.nullable().optional(),
    // Opaque to the server. Validated for shape and size only — never for
    // content, and never queried into (ARCHITECTURE.md §4.3).
    payload: z.record(z.unknown()).nullable().optional(),
    // Populated by E1 (family sharing). Accepted now so adding sharing does
    // not change the wire format; the A3 client always leaves it unset.
    pregnancyId: z.string().min(1).max(64).nullable().optional(),
  })
  .strict()
  .refine(
    (r) =>
      r.payload == null ||
      JSON.stringify(r.payload).length <= MAX_PAYLOAD_BYTES,
    { message: "payload demasiado grande" },
  );

export type SyncRecordInput = z.infer<typeof SyncRecordSchema>;

export const PushRequestSchema = z
  .object({
    records: z.array(SyncRecordSchema).max(MAX_PUSH_RECORDS),
  })
  .strict();

export type PushRequest = z.infer<typeof PushRequestSchema>;

/**
 * Per-record outcome of a push.
 *
 * `stale` is not an error: the server simply holds a newer version, and the
 * client clears its dirty flag either way because the next pull brings the
 * winner. Treating `stale` as a failure is how a client ends up pushing the
 * same losing record forever.
 */
export type PushOutcome = "accepted" | "stale" | "rejected";

export interface PushResult {
  store: string;
  recordId: string;
  outcome: PushOutcome;
  /** Present when `rejected`, in plain Spanish. */
  reason?: string;
}

export interface PushResponse {
  results: PushResult[];
  /** Server clock, so the client can measure its own drift. */
  serverTime: number;
}

/**
 * A record as it comes back from a pull.
 *
 * `serverUpdatedAt` is added by the server and is the only value the client
 * may advance its `since` cursor to. It is deliberately NOT part of
 * `SyncRecordSchema`: a client cannot set it, and sending it would be a 400.
 */
export type PulledRecord = SyncRecordInput & { serverUpdatedAt: number };

export interface PullResponse {
  records: PulledRecord[];
  serverTime: number;
  /**
   * Opaque continuation token. Present when more records are waiting; pass it
   * back as `?cursor=` to get the next page.
   */
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Pull query
// ---------------------------------------------------------------------------

/**
 * The pull cursor is `serverUpdatedAt:store:recordId`.
 *
 * A plain `since=<ms>` cursor cannot page correctly: if more records share one
 * millisecond than fit in a page, advancing `since` past that millisecond drops
 * them and not advancing it loops forever. Ordering by the full sort key and
 * remembering where the page stopped has neither failure mode.
 */
export interface PullCursor {
  /** A server-clock value (`serverUpdatedAt`), never a client `updatedAt`. */
  updatedAt: number;
  store: string;
  recordId: string;
}

export function encodeCursor(cursor: PullCursor): string {
  return `${cursor.updatedAt}:${cursor.store}:${cursor.recordId}`;
}

export function decodeCursor(raw: string): PullCursor | null {
  const firstSep = raw.indexOf(":");
  if (firstSep < 0) return null;
  const secondSep = raw.indexOf(":", firstSep + 1);
  if (secondSep < 0) return null;

  const rawUpdatedAt = raw.slice(0, firstSep);
  const store = raw.slice(firstSep + 1, secondSep);
  const recordId = raw.slice(secondSep + 1);

  // `Number("")` is 0, so an empty numeric part has to be rejected explicitly.
  if (!/^\d+$/.test(rawUpdatedAt)) return null;
  const updatedAt = Number(rawUpdatedAt);
  if (!Number.isSafeInteger(updatedAt)) return null;
  if (!store || !recordId) return null;

  return { updatedAt, store, recordId };
}

export const PullQuerySchema = z
  .object({
    since: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    limit: z.coerce.number().int().min(1).max(MAX_PULL_LIMIT).optional(),
    cursor: z.string().max(256).optional(),
  })
  .strict();

/** The only query params /api/v1/sync accepts. Anything else is a 400. */
export const PULL_ALLOWED_PARAMS = new Set(["since", "limit", "cursor"]);
