import { defineConfig } from "vitest/config";
import path from "node:path";

// BUILD-PLAN V3 — the second vitest project: the Dexie layer, under
// `fake-indexeddb`.
//
// Separate from `vitest.config.mts` rather than a second `environment` inside
// it, for one reason: `npm test` is the gate that runs on every save and it is
// fast because nothing in it touches IndexedDB. Opening a database, running
// seven upgrade steps and deleting it again is not fast, and folding it into
// the main suite would make the cheap gate expensive for every unit that never
// goes near Dexie.
//
// So `npm test` stays as it is and `npm run test:db` is a gate of its own. Both
// run in CI; both are in the queue's §2 list from V3 on.
//
// `environment: "node"` with `fake-indexeddb/auto` in the setup file, rather
// than jsdom: what these tests need is IndexedDB and nothing else, and a whole
// DOM would be a second thing to keep in step with the browser for no benefit.
// The setup file explains the one global it does define.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/db.test.ts", "test/db/**/*.test.ts"],
    setupFiles: ["test/db/setup.ts"],
    // Dexie keeps module-level state (`_db` in lib/db.ts) and `fake-indexeddb`
    // keeps a process-wide store. One file at a time, in one process, so a
    // half-upgraded database can never leak into a neighbouring test.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
});
