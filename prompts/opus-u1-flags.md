# Unit U1 — runtime flag store + `/admin/flags`. OPUS session. Absorbs BUILD-PLAN I5's flag half.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §1–§4 and §7, `docs/HANDOFF-2026-09-06.md` §2 and §4,
BUILD-PLAN.md A7 + I5, `lib/server/admin.ts`, `lib/admin/audit.ts`, `lib/server/account.ts` (TABLE_DISPOSITION),
`app/api/v1/placements/route.ts` (the empty-whitelist pattern), `app/sw.ts`. Execute under the autonomy protocol (§4).

Owns: `lib/flags/**` (pure: keys, defaults, parsing) · `lib/server/flags.ts` · `app/api/v1/flags/**` ·
`app/admin/flags/**` · `components/admin/FlagToggles.tsx` · `drizzle/**` (one new migration) ·
`lib/server/schema.ts` (append one table) · `lib/server/account.ts` (append one TABLE_DISPOSITION line) ·
`lib/admin/audit.ts` (append `flag_changed` + its meta shape) · `app/admin/layout.tsx` (append one nav link) ·
`app/sw.ts` (append one runtime-caching rule) · `docs/log/u1.md`.

Build:
- Table `appFlags`: `key` (varchar PK, one of `FLAG_KEYS`), `value` bool, `updatedAt`, `updatedBy` (admin user id).
  Disposition: `retained` (same reasoning as `adminAudit` — no health content, ids resolve to nobody after deletion).
- `FLAG_KEYS` (pinned by a test, adding one is a decision): `ai_baby_paused` (server-only, default false) and
  `recomendados` (client-visible surface, default false). Each key declares `scope: "server" | "client"` and a default.
- `lib/server/flags.ts`: `getFlag(key)` / `getClientFlags()` with a 60 s in-process cache; with `DATABASE_URL` unset
  returns the defaults — the app must build and run with no database exactly as before. `setFlag(key, value, actor)`
  writes the row AND the audit row in the same call; there is no un-audited write path.
- **One-directional for money:** nothing in this store can turn the AI feature on. `AI_BABY_ENABLED=true` stays the
  master switch; `ai_baby_paused=true` only adds a stop. Document this in the module header; U2 wires it into
  `lib/server/aiBaby.ts` — you do not touch that file.
- `GET /api/v1/flags`: no query params accepted (reject, don't ignore — J3 pattern), returns **client-scope flags only**,
  `Cache-Control: public, max-age=60`. Add it to `app/api/v1/api.test.ts`'s whitelist tests. SW: NetworkFirst with
  cached fallback; the client hook `useFlag(key)` (React Query, already a dependency) returns the default until
  resolved and on any error — a flag fetch must never block or blank a render, online or offline.
- `/admin/flags`: one row per key with the scope, description, current value, who changed it last, and a toggle
  (server action in `app/admin/flags/actions.ts`, re-authorising via `requireAdmin`). Nav link in the admin layout.
- Tests: keys/defaults pinned; `getFlags` returns defaults without a DB; API rejects params and never returns a
  server-scope key; audit meta shape for `flag_changed` is `{ key, value }` and nothing else; TABLE_DISPOSITION test
  still matches `schema`; the existing admin "no payload" source scan still passes; e2e: non-admin gets 404 on
  `/admin/flags` (extend `e2e/admin.spec.ts`).

Exit: gates green (§4.3); `/admin/flags` toggles both keys with an audit row each; `GET /api/v1/flags` returns
`{"recomendados":false}` on a fresh DB and 400s on `?x=1`; production build passes with `DATABASE_URL` unset.
Open the PR the turn the criteria pass; write `docs/log/u1.md`. Then continue per the run file that started you.
