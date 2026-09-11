# Unit V2 — behavioural unit tests for family sharing through a backend interface. OPUS session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`lib/server/sync.ts` + `lib/server/sync.test.ts` (the pattern: `SyncBackend` + `memoryBackend()`),
`lib/server/sharing.ts`, `lib/sharing/routeContract.test.ts`, `lib/sharing/**` (levels, fields),
`app/api/v1/sharing/route.ts`, `DECISIONS.md` sections "E1 — family sharing" and "K3 — sharing levels" only.
Execute under the autonomy protocol.

Owns: `lib/server/sharing.ts` · `lib/server/sharingBackend.ts` (new) · `lib/server/sharing.test.ts` (new) ·
`app/api/v1/sharing/route.ts` (constructor wiring only, no behaviour change) · `docs/log/v2.md`.

Decision already made: the A3 pattern. The rules stay in `sharing.ts` and take a `SharingBackend`; the Drizzle
queries move behind that interface (`drizzleSharingBackend(db)`), and the tests run the real rules over a `Map`.
`routeContract.test.ts` stays and must keep passing unchanged.

Build:
- Define `SharingBackend` with the smallest surface the rules need (pregnancies, memberships, invites, snapshots,
  tasks, cheers — read/write by id, no SQL leaking through). Every exported function in `sharing.ts` keeps its name
  and signature except that `database: Database` becomes `backend: SharingBackend`; the route constructs the
  Drizzle backend once. `npm run build` proves the wiring.
- `sharing.test.ts` asserts the decisions, not the queries: an invite accepted twice; a revoked member reading a
  snapshot (nothing); a `familiar` never seeing a `partner`-level field; the server re-applying levels even when
  the device already did (K3 "two gates"); `setAccompanying` rules; task assignment only by a live member;
  cheers paging at `CHEER_PAGE_SIZE`; deletion cascades per `TABLE_DISPOSITION`. Aim for 25–40 focused cases.
- A test in `lib/server/admin.test.ts`'s privacy-scan spirit: `sharingBackend.ts` is the only file under
  `lib/server/` that imports Drizzle for the sharing tables (text assertion).
- No new runtime dependency. No schema change. No change to the wire format of `/api/v1/sharing`.

Exit: gates green; `e2e/invite.spec.ts`, `companion.spec.ts`, `family-surfaces.spec.ts`, `revoked-companion.spec.ts`
green unchanged; new unit file green. Open the PR that turn; write `docs/log/v2.md` with the interface listed so W5
copies it exactly. Then continue per the run file.
