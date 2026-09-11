# Unit W5 — backend-interface tests for the remaining server modules. SONNET session. Depends on V2 (merged).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`docs/log/v2.md`, `lib/server/sharingBackend.ts` + `lib/server/sharing.test.ts` (the shape to copy),
`lib/server/questions.ts`, `lib/server/support.ts`, `lib/server/push.ts`, `lib/server/photos.ts`, their existing
`*.test.ts`, and the routes/actions that construct them (`grep -rn "questions\|support\|photos\|push" app/api app/admin
--include=*.ts -l`). Execute under the autonomy protocol.

Owns: those four modules · `lib/server/{questions,support,push,photos}Backend.ts` (new) · their `*.test.ts` (extend
or new) · the routes/actions that construct them (wiring only) · `docs/log/w5.md`.

Decision already made: copy V2's cut exactly — rules keep their names and signatures, `database` becomes
`backend`, Drizzle moves behind `drizzle<Module>Backend(db)`, tests run the real rules over a `Map`. Existing
text-assertion tests stay green unchanged.

Build, one module per commit, in this order (smallest first): `questions` (queue states, only an admin publishes,
published rows carry no author), `support` (the five repairs: revoke member, remove device, revoke sessions →
`sessionVersion` bump, force resync → `syncEpoch` bump, restore → tombstone cleared and both clocks stamped),
`push` (subscription upsert/delete, dispatch picks only due reminders, a failed endpoint is pruned after the
documented count), `photos` (signed-URL issue checks ownership + opt-in, deletion in both directions, admin never
reaches a photo). 15–25 cases per module; assert decisions, not SQL.
- Same-shaped work: after `questions` is done and reviewed, the other three may be fanned out as parallel Sonnet
  subagents per `fable-directs-sonnet-builds` §Fan-out, each owning its module; you verify and merge into the one PR.
- No schema change, no wire change, no new dependency.

Exit: gates green; e2e for the touched surfaces green (`admin.spec.ts`, `preguntas.spec.ts`, `photo-backup.spec.ts`,
`sync.spec.ts`, `companion.spec.ts` for push). Write `docs/log/w5.md`. Then continue per the run file.
