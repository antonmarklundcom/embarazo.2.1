import "server-only";

import { eq } from "drizzle-orm";

import { db, dbOrNull, isDatabaseConfigured } from "./db";
import { adminAudit, appFlags, users } from "./schema";
import { parseAuditMeta } from "@/lib/admin/audit";
import {
  clientScope,
  defaultFlags,
  mergeFlagRows,
  type ClientFlagValues,
  type FlagKey,
  type FlagValues,
} from "@/lib/flags/keys";

// BUILD-PLAN I5 (flag half) / U1 — the runtime flag store.
//
// ---------------------------------------------------------------------------
// ONE-DIRECTIONAL FOR MONEY. Read this before adding a flag.
// ---------------------------------------------------------------------------
//
// Nothing in this store can turn a feature ON. `ai_baby_paused` is named the
// way it is on purpose: `AI_BABY_ENABLED=true` in the deployment's environment
// remains the master switch, and the flag can only ADD a stop on top of it.
//
// The reason is that this table is writable from a browser session, and the
// thing on the other side of the AI flag is a metered API somebody pays for.
// A panel that could enable spending would mean an admin session compromise is
// a bill; a panel that can only pause means the worst an attacker can do with
// it is switch a feature off, which is recoverable and audited. Any future
// flag that gates money must be phrased as a brake — `*_paused`, `*_frozen` —
// never as `*_enabled`.
//
// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
//
// Every read goes through a 60-second in-process cache, and every read falls
// back to `defaultFlags()`:
//
//   * with `DATABASE_URL` unset the store never queries at all and the app
//     behaves exactly as it did before this file existed (ARCHITECTURE.md
//     §4.2 — local-only is a supported configuration, not a degraded one);
//   * a query that throws returns the defaults rather than propagating, so a
//     database hiccup cannot blank a page that merely asked whether a rail is
//     switched on.
//
// The cache is per process and deliberately dumb: 60 seconds is short enough
// that flipping a flag in the panel is visibly a click rather than a deploy,
// and long enough that a flag read on a hot path is not a query.

/** How long a read is reused. Also the worst-case delay after a toggle. */
export const FLAG_CACHE_MS = 60_000;

interface CacheEntry {
  values: FlagValues;
  readAt: number;
}

let cache: CacheEntry | null = null;

/** Drop the cached values. Called after a write, and by tests. */
export function invalidateFlagCache(): void {
  cache = null;
}

async function readFlags(): Promise<FlagValues> {
  const now = Date.now();
  if (cache && now - cache.readAt < FLAG_CACHE_MS) return cache.values;

  const database = dbOrNull();
  if (!database) {
    // No database: the defaults are the answer, and they are stable, so cache
    // them too rather than re-deciding on every call.
    cache = { values: defaultFlags(), readAt: now };
    return cache.values;
  }

  let values: FlagValues;
  try {
    const rows = await database
      .select({ key: appFlags.key, value: appFlags.value })
      .from(appFlags);
    values = mergeFlagRows(rows);
  } catch {
    // Deliberately not rethrown: see the header. A flag read is a question
    // about configuration, and "we could not ask" has a safe answer.
    values = defaultFlags();
  }

  cache = { values, readAt: now };
  return values;
}

/** The current value of one flag, of either scope. Server-side callers only. */
export async function getFlag(key: FlagKey): Promise<boolean> {
  return (await readFlags())[key];
}

/** Every flag. For `/admin/flags` and for server code that needs several. */
export async function getFlags(): Promise<FlagValues> {
  return readFlags();
}

/**
 * The flags a browser may see.
 *
 * The filter is here rather than in the route so that there is one answer to
 * "what is publishable", and it is derived from each key's declared scope
 * rather than from a list the route keeps.
 */
export async function getClientFlags(): Promise<ClientFlagValues> {
  return clientScope(await readFlags());
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Set a flag and audit it, in one call.
 *
 * There is no un-audited write path — no exported update, no direct table
 * access anywhere else in the app — because ARCHITECTURE.md §9 makes the audit
 * row the thing that justifies the access, and a flag flip is the most
 * consequential thing this panel can do that leaves no other trace: no deploy,
 * no commit, no diff, just different behaviour for everyone at once.
 *
 * The row and the audit go in one transaction so the pair cannot come apart.
 *
 * @throws if no database is configured — a caller that got here without one
 *         has already skipped a check (`isFlagStoreAvailable`).
 */
export async function setFlag(
  key: FlagKey,
  value: boolean,
  actor: { id: string },
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "setFlag() called with no DATABASE_URL. Flags are read-only in " +
        "local-only mode (ARCHITECTURE.md §4.2).",
    );
  }

  // The shape is validated before either write, by the same pure schema
  // `recordAudit` uses. The insert is written here rather than through
  // `recordAudit` for one reason: that function lives in `lib/server/admin.ts`
  // next to `requireAdmin`, so importing it pulls next-auth into every module
  // that reads a flag — including `app/api/v1/flags/route.ts`, a public route
  // whose parameter rejection is unit-tested in `app/api/v1/api.test.ts` and
  // which therefore has to import without a request context. The validation,
  // which is the part worth having exactly once, is still shared.
  const meta = parseAuditMeta("flag_changed", { key, value });
  const now = new Date();

  await db().transaction(async (tx) => {
    await tx
      .insert(appFlags)
      .values({ key, value, updatedBy: actor.id, updatedAt: now })
      .onDuplicateKeyUpdate({
        set: { value, updatedBy: actor.id, updatedAt: now },
      });

    await tx.insert(adminAudit).values({
      id: crypto.randomUUID(),
      actorUserId: actor.id,
      action: "flag_changed",
      meta,
    });
  });

  invalidateFlagCache();
}

/** True when flags can be written, i.e. when there is a database. */
export function isFlagStoreAvailable(): boolean {
  return isDatabaseConfigured();
}

/** Who last changed each flag, for the panel. Uncached — it is one page load. */
export async function flagAudit(): Promise<
  Record<string, { updatedAt: Date; updatedBy: string | null }>
> {
  const database = dbOrNull();
  if (!database) return {};
  try {
    const rows = await database
      .select({
        key: appFlags.key,
        updatedAt: appFlags.updatedAt,
        updatedBy: appFlags.updatedBy,
      })
      .from(appFlags);
    return Object.fromEntries(
      rows.map((row) => [
        row.key,
        { updatedAt: row.updatedAt, updatedBy: row.updatedBy },
      ]),
    );
  } catch {
    return {};
  }
}

/** The email of an admin id, so the panel can say who rather than which uuid. */
export async function adminEmailById(id: string | null): Promise<string | null> {
  if (!id) return null;
  const database = dbOrNull();
  if (!database) return null;
  try {
    const rows = await database
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0]?.email ?? null;
  } catch {
    return null;
  }
}
