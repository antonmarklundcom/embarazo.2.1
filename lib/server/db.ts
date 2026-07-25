import "server-only";

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { schema } from "./schema";

// BUILD-PLAN A1 — the server-side database handle.
//
// Hard requirement from ARCHITECTURE.md §4.2: the app must build and run with
// DATABASE_URL unset. That is "seguir sin cuenta" / local-only mode, and it is
// not a degraded state — it is the path a user who declines an account takes,
// and the path every local `npm run build` takes. So this module never
// connects at import time and never throws on import.
//
// Call sites should branch on `isDatabaseConfigured()` and degrade gracefully;
// `db()` throws only if someone calls it in a configuration where it cannot
// possibly work, which is a bug worth surfacing loudly.

export type Database = MySql2Database<typeof schema>;

let pool: mysql.Pool | undefined;
let instance: Database | undefined;

function connectionString(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url ? url : undefined;
}

/** True when a database is configured for this process. */
export function isDatabaseConfigured(): boolean {
  return connectionString() !== undefined;
}

/**
 * The Drizzle handle. Created lazily on first use and reused afterwards, so
 * Next.js route handlers share one pool per server process.
 *
 * @throws if DATABASE_URL is not set — check `isDatabaseConfigured()` first.
 */
export function db(): Database {
  if (instance) return instance;

  const url = connectionString();
  if (!url) {
    throw new Error(
      "db() called with no DATABASE_URL. Account features must check " +
        "isDatabaseConfigured() and degrade to local-only mode instead " +
        "(ARCHITECTURE.md §4.2).",
    );
  }

  pool = mysql.createPool({
    uri: url,
    // Hostinger's managed MySQL is not generous with connections; a small pool
    // that waits beats a large one that gets refused.
    connectionLimit: 5,
    waitForConnections: true,
    // Keep BIGINT columns (our epoch-millisecond timestamps) as JS numbers.
    // Every value we store is well inside Number.MAX_SAFE_INTEGER.
    supportBigNumbers: true,
    bigNumberStrings: false,
  });

  instance = drizzle(pool, { schema, mode: "default" });
  return instance;
}

/** Returns the handle, or null when running without a database. */
export function dbOrNull(): Database | null {
  return isDatabaseConfigured() ? db() : null;
}

/** Closes the pool. For scripts and tests; the server process does not call it. */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    instance = undefined;
  }
}
