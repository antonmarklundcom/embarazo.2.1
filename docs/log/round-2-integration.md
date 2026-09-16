# Go-live queue round 2 — integration

Five units merged onto a branch cut from `origin/main` (`1d250d3`, the round-1
squash), in the order the manager set: `unit/w4` → `unit/w5` → `unit/u9` →
`unit/docs-path-cleanup` → `unit/npm-audit-review`. One merge commit each, no
rebases, no squashes, so each unit's own history stays readable.

## Bases

All four inherited branches, and `unit/w4`, were cut from `604fb51` or its
descendant `2b7bc8b` — i.e. **before** round 1. `origin/main` is `1d250d3`, a
squash of round 1 whose parent is `604fb51`. Git therefore takes `604fb51` (or
`d0f23a0`) as the merge base for every one of them, which is correct: the trees
of `2b7bc8b` and `1d250d3` are identical (`git diff 2b7bc8b origin/main` is
empty), so nothing from round 1 is at risk of being reverted — but it does mean
every file round 1 touched **and** a unit touched shows up as a real conflict
rather than a fast-forward.

Three conflicts resulted. None was resolved by picking a side.

## Conflict 1 — `app/(app)/ajustes/AjustesClient.tsx` (w4 vs. round 1)

Round 1 carried R0-1, which deleted a local `toDateInput` that sliced a UTC
`toISOString()` (a timezone bug) and routed every call site through
`@/lib/appointments`'s version, including `today`. W4 then split the whole file.

Resolved by taking the w4 side **after checking it carries R0-1's fix**, not on
the assumption that it does: no local `toDateInput` definition and no
`toISOString().slice` survives anywhere under `app/(app)/ajustes/` or
`components/ajustes/`, `today` is `toDateInput(Date.now())`, and all five
remaining call sites (`AppointmentSettings`, `GestationSettings`,
`PregnancyDateSettings`) import `toDateInput` from `@/lib/appointments`.

## Conflict 2 — `app/admin/preguntas/page.tsx` (w5 vs. u9)

The one the manager flagged. Both units add an import and both touch the top of
`AdminQuestionsPage`.

- **w5** puts `questions.ts` behind `QuestionsBackend`: `pendingQuestions(database)`
  → `pendingQuestions(backend)`, with `const backend = database ? drizzleQuestionsBackend(database) : null`.
- **u9** adds a draft-availability probe and passes `question`/`draftStatus`
  down to `AdminQuestionActions`.

Git merged the function body correctly (w5's `backend` construction *and* u9's
draft block) and only the import block conflicted; both imports are needed, so
both were kept.

**The reconciliation the manager asked about turned out not to be needed, and
that is worth stating explicitly rather than leaving as a silent non-event.**
U9 does not call into `questions.ts` at all. Its `suggestDraft` action calls
`generateDraft(drizzleDraftAuditStore(database), …)`, and `lib/server/aiDraft.ts`
defines its own `DraftAuditStore` interface plus `drizzleDraftAuditStore(database)`
touching only `adminAudit` — independently the same backend-interface cut w5
applies to the other four modules. So no u9 call site changed shape under w5,
and the only questions.ts calls on the page are the two w5 rewrote. Checked by
grepping every u9 file for imports of `@/lib/server/{questions,support,push,photos}`:
the only hits are files u9 never modified.

## Conflict 3 — `.github/workflows/ci.yml` (docs-path-cleanup vs. round 1)

`unit/docs-path-cleanup` fixed a K21 comment's path,
`docs/FABLE-PLAN-2026-08.md` → `docs/archive/…`. Round 1's W1 had meanwhile
rewritten that same comment block, replacing the K21 paragraph at the top with a
W1 paragraph and pushing the K21 text further down — **where it still carried
the stale path**. Taking either side alone would have lost one unit's intent.

Resolved by keeping W1's new paragraph *and* applying the path fix to the K21
paragraph in its new position. A sweep for the other five moved filenames found
no remaining stale reference outside `DECISIONS.md`, which is off-limits and
which this unit deliberately left alone.

## `unit/npm-audit-review` — lockfile

This unit is `package-lock.json` + its log only; it never edited
`package.json`. Its lock was generated against the **pre-round-1**
`package.json`, so applying it wholesale would have reverted round 1's own
dependency bumps (`@tanstack/react-query`, `mysql2`, `zod`, `@playwright/test`,
`postcss`, `@types/react-dom`, `@typescript-eslint/eslint-plugin`).

Git auto-merged the lock without conflict, which for a lockfile is a claim to
check rather than accept. It was checked three ways and holds:

1. Round 1's bumps are all present at their round-1 versions, and the audit
   fixes are all present at theirs — `next` 15.5.25, `sharp` 0.35.4,
   `js-yaml` 4.3.2, `brace-expansion` 5.0.9.
2. `npm ci` from a deleted `node_modules` succeeds, which is the real test of
   lock/manifest consistency.
3. `npm audit` reports **8 vulnerabilities (5 moderate, 3 high)** — exactly the
   residual state `docs/log/npm-audit-2026-09.md` predicted, with the critical
   Next.js RCE pair closed. `npm audit fix --dry-run` offers nothing further
   in range, so the tree sits at the same fixed point the unit reached.

No regeneration was needed and none was done.

## Gates, after all five merges

| gate | result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 1293 tests, 108 files |
| `npm run test:db` | PASS — 40 tests |
| `npm run validate:content` | PASS — 16 files |
| `npm run build` (with `PHOTO_STORAGE_ENDPOINT`, `NEXT_PUBLIC_SUPPORT_EMAIL`) | PASS — 96 pages |
| `npx playwright test` (full suite, 38 spec files) | PASS — 140/140 |

`tsc` and `lint` were also run after each individual merge, and `npm test` after
the w5+u9 pair, so a failure would have been attributable to one merge rather
than to the pile.

Unit-test count went 1187 → 1293 (+106): w5's four new backend test files and
u9's `draft`/`aiDraft` suites. No test was removed or skipped.

## e2e, before and after

Full suite both times, on a production build.

- **before** (`origin/main`, `1d250d3`, nothing merged): 140 passed, 0 failed, 0 skipped.
- **after** (all five units merged): 140 passed, 0 failed, 0 skipped.

Compared by name, not by count: the sorted list of `file:line › title` is
byte-identical between the two runs. Neither w5 nor u9 adds an e2e spec, so an
identical set is the expected result here, not a coincidence to wave at.

## Not done

Nothing was fixed that was not broken by the combination. The eight residual
`npm audit` findings are pre-existing and documented in
`docs/log/npm-audit-2026-09.md` as needing major bumps blocked on
next-auth v5 stable and an upstream `@serwist/next` release; they are not a
regression from this integration and were left alone.

One backlog item was recorded in `docs/decisions-needed.md`: finish W4's PIN
card extraction once `lib/pinPolicy.test.ts` can be repointed.
