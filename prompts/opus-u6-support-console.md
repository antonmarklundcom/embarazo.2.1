# Unit U6 — I1 support console gaps. OPUS session. Depends on U1 (merged — migration order).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §1(2), §2–§4, §7, BUILD-PLAN.md A3 + A7 + E1 + I1,
`DECISIONS.md` sections "A3 — sync engine" and "E1", `docs/log/u1.md`, `lib/sync/protocol.ts`, `lib/sync/client.ts`,
`lib/server/sync.ts`, `lib/server/auth.ts`, `lib/server/admin.ts`, `app/admin/actions.ts`,
`app/admin/usuarios/[id]/page.tsx`, `components/admin/AdminUserActions.tsx`. Execute under the autonomy protocol (§4).

Owns: `app/admin/usuarios/**` · `components/admin/AdminUserActions.tsx` · `app/admin/actions.ts` (append) ·
`lib/admin/audit.ts` (append actions + meta shapes) · `lib/server/admin.ts` · `lib/server/support.ts` (new) ·
`lib/sync/protocol.ts` · `lib/sync/client.ts` · `lib/server/sync.ts` · `lib/server/auth.ts` (session version) ·
`lib/server/schema.ts` (append columns) · `drizzle/**` (one migration, generated after `git merge main`) ·
`e2e/admin.spec.ts` + `e2e/sync.spec.ts` (extend) · `docs/log/u6.md`.

The three support cases and their exact semantics (do not invent others):
1. **"Sacá a mi ex del embarazo"** — list `pregnancyMembers` of the user's pregnancies (role, joined, revoked);
   action *revocar acceso* sets `revokedAt` (E1 already makes that immediate). Audit `member_revoked` `{ pregnancyId,
   memberUserId }`.
2. **"No puedo entrar" / a lost or stolen phone** — devices are `pushSubscriptions` rows (metadata: created, last
   success, endpoint host only — never the endpoint URL itself, it is a bearer secret). Actions: *quitar dispositivo*
   (delete that subscription row) and *cerrar sesión en todos los dispositivos*: new `users.sessionVersion` int,
   stamped into the JWT at sign-in and checked in the `jwt`/`session` callbacks; a mismatch invalidates the session.
   Audit `device_removed` `{ subscriptionId }`, `sessions_revoked` `{}`.
3. **"Perdí mis datos"** — (a) *forzar resincronización*: new `users.syncEpoch` int; the sync pull/push responses
   carry `epoch`; the client stores it in `syncState` and, on a change, resets its pull cursor to 0 and re-pulls
   (LWW makes a full re-pull idempotent — prove it with a test on the real handlers, two devices, like
   `lib/server/sync.test.ts`). Audit `resync_forced` `{}`. (b) *restaurar registro borrado*: tombstones listed as
   `store · recordId · deletedAt` — **never payload**; action clears `deletedAt` and sets both `updatedAt` and
   `serverUpdatedAt` to now, so every client's LWW accepts the restore and the pull cursor picks it up. Audit
   `record_restored` `{ store, recordId }`. Show tombstones from the last 30 days only (display filter — there is
   no purge to honour).
- All actions re-authorise via `requireAdmin`, take ids from the form and the actor from the session, and write the
  audit row in the same transaction as the mutation where the driver allows it.
- Protocol changes are additive: an old client that ignores `epoch` keeps working; zod schemas accept its absence.
- Tests: audit meta shapes pinned; the admin "no payload" source scan still passes; session-version mismatch → no
  session; two-device epoch re-pull converges; restore wins LWW on a device holding the tombstone; e2e: each action
  visible and 404 for non-admin.

Exit: gates green (§4.3); each of the three cases is resolvable from `/admin/usuarios/[id]` without touching the
database by hand; migration generated with `npm run db:generate` (never hand-written) on top of U1's. Open the PR
that turn; write `docs/log/u6.md`. Spawn nothing.
