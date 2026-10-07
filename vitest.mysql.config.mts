import { defineConfig } from "vitest/config";
import path from "node:path";

// The third vitest project: the server's SQL paths against a REAL MySQL or
// MariaDB, for the guarantees an in-memory fake cannot prove — single-use
// claims, conditional writes, revocation racing an acceptance, the session
// check against a deleted row.
//
// Opt-in. `npm run test:mysql` needs TEST_DATABASE_URL pointing at a
// throwaway, local database whose name contains "test"
// (test/mysql/setup.ts refuses anything else, and wipes it between tests).
// Without the variable every file here is skipped, so `npm test` and CI are
// unaffected.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/mysql/**/*.test.ts"],
    setupFiles: ["test/mysql/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
});
