# Unit V3 — unit tests for the Dexie layer under fake-indexeddb. OPUS session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`lib/db.ts`, `vitest.config.mts`, `test/stubs/server-only.ts`, `docs/ARCHITECTURE.md` §4 "Dexie schema versions",
`lib/backup.ts`, `lib/sync/stores.ts`, `lib/sync/client.ts` (how `syncState` is read), `e2e/backup-restore.spec.ts`
(what e2e already covers — do not duplicate it). Execute under the autonomy protocol.

Owns: `vitest.db.config.mts` (new) · `test/db/**` (new: setup file, fixtures) · `lib/db.test.ts` (new) ·
`package.json` (`test:db` script + `fake-indexeddb` devDependency; one DECISIONS-style note in the log) ·
`.github/workflows/ci.yml` (one line: run `npm run test:db` after `npm test`) · `docs/log/v3.md`.

Decision already made: a second vitest project, `environment: "node"`, setup file importing `fake-indexeddb/auto`
and deleting the database between tests. `npm test` stays as it is (fast, no IndexedDB); `npm run test:db` is the
new gate and joins §2's list for every later unit.

Build:
- Fixtures: for each `MiBebeDB` version from the oldest still in the `.version(n)` chain to current, a JSON fixture
  of a small populated database at that version (write them by opening a Dexie instance pinned to that version's
  stores in the test itself — no hand-written IndexedDB dumps). A test opens each fixture, upgrades to current,
  and asserts every row survives with the shape the current code reads (`Partial<SyncMeta>` fields undefined, not
  missing-and-crashing; `syncState` keyed `"default"`; profile `locale`/`heroTheme`/`showComparison` defaults).
- Behaviour: `softDelete` stamps `deletedAt` and `updatedAt`; `notDeleted` filters; `wipeAllData` empties every
  store and the PIN material; `PHOTO_BACKUP_STORES` rows keep their `PhotoBackupMeta`; the `db()` singleton reopens
  after `wipeAllData`.
- A guard test: the `.version(n)` chain is strictly increasing and the highest equals the number
  `docs/ARCHITECTURE.md` §4 documents (read the doc as text).
- Keep the run under 10 s. No change to `lib/db.ts` unless a test finds a real bug — then fix it, log it, and add
  the regression case.

Exit: gates green including `npm run test:db`; CI line added; e2e untouched and green for `offline.spec.ts`,
`backup-restore.spec.ts`, `sync.spec.ts`. Open the PR that turn; write `docs/log/v3.md` (fixture format described in
≤ 4 lines so later units add versions). Then continue per the run file.
