import { afterEach, beforeEach } from "vitest";
import "fake-indexeddb/auto";

import { wipeAllData } from "@/lib/db";

// V3 — what the Dexie tests need before they can run at all.
//
// Two globals, both deliberate:
//
//   1. `fake-indexeddb/auto` installs `indexedDB` and the `IDB*` constructors
//      on `globalThis`. That import is the whole reason this project exists.
//
//   2. `window`. `lib/db.ts` guards on `typeof window === "undefined"` in two
//      places — `db()` throws and `wipeAllData()` returns early — because the
//      module is imported by server components and a Dexie instance must never
//      be constructed there (ARCHITECTURE.md §4.1). Under `environment: "node"`
//      that guard would make the entire module untestable, which is how it has
//      stayed untested. Defining the global is the smallest thing that says
//      "this is the browser path" without pulling in a DOM.
//
//      It is `globalThis`, not a stub object, so anything the code reaches for
//      through `window` is the same thing it would reach for directly. No test
//      here asserts anything about `window` itself.
if (typeof globalThis.window === "undefined") {
  (globalThis as { window?: unknown }).window = globalThis;
}

// Every test starts on an empty database and leaves one behind.
//
// `wipeAllData()` rather than `indexedDB.deleteDatabase()` because it also
// clears `lib/db.ts`'s module-level singleton — deleting the database out from
// under a live `MiBebeDB` instance leaves the next `db()` holding a handle to
// something that no longer exists, which fails in a way that looks like a bug
// in whatever test runs next.
beforeEach(async () => {
  await wipeAllData();
});

afterEach(async () => {
  await wipeAllData();
});
