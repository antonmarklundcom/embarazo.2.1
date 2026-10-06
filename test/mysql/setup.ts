import { beforeAll, beforeEach } from "vitest";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "node:path";

// See vitest.mysql.config.mts. The guard is deliberately blunt: this file
// DELETES every row of every table before each test.
const url = process.env.TEST_DATABASE_URL?.trim();

export const mysqlEnabled = Boolean(url);

function assertThrowaway(raw: string): void {
  const parsed = new URL(raw);
  const host = parsed.hostname;
  const name = parsed.pathname.replace(/^\//, "");
  if (!["127.0.0.1", "localhost", "::1"].includes(host) || !/test/i.test(name)) {
    throw new Error(
      `test:mysql refuses ${host}/${name}: it wipes the database. Use a local database whose name contains "test".`,
    );
  }
}

if (url) {
  assertThrowaway(url);
  // The app reads DATABASE_URL; point it at the throwaway database only.
  process.env.DATABASE_URL = url;

  beforeAll(async () => {
    const connection = await mysql.createConnection({ uri: url });
    await migrate(drizzle(connection), {
      migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle"),
    });
    await connection.end();
  });

  beforeEach(async () => {
    const connection = await mysql.createConnection({ uri: url });
    const [rows] = await connection.query("SHOW TABLES");
    for (const row of rows as Record<string, string>[]) {
      const table = Object.values(row)[0]!;
      if (table === "__drizzle_migrations") continue;
      await connection.query(`DELETE FROM \`${table}\``);
    }
    await connection.end();
  });
}

/** A raw connection for seeding and inspecting rows. */
export async function sql() {
  return mysql.createConnection({ uri: url! });
}
