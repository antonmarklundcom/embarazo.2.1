# Unit W2 — docs entrance + scripts typecheck. SONNET session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4, the first
30 lines of every file in `docs/` (their banners say what supersedes what), `README.md` headings,
`docs/LAUNCH-CHECKLIST.md` §7 (the `.mts` typecheck item), `tsconfig.json`, `scripts/*.mts`. Execute under the
autonomy protocol.

Owns: `docs/INDEX.md` (new) · `docs/archive/**` (new; moves only, `git mv`) · `README.md` (one pointer line under the
title) · `tsconfig.json` (`include` only) · `scripts/gen-guarani-review.mts` (the two type errors) · `docs/log/w2.md`.

Decision already made: `DECISIONS.md` stays where it is and append-only. Nothing is rewritten; superseded documents
move under `docs/archive/` with their banner notes intact, and every path that referenced them gets a one-line
pointer at the old path only if a test or script reads it (grep first — `lib/i18n/guaraniReview.test.ts` reads
`docs/GUARANI-REVIEW.md`; that one does not move).

Build:
- `docs/INDEX.md`: one table, every file in `docs/` and the repo root docs, columns: file · status (current /
  history / generated) · read when · superseded by. A 6-line "start here" for a new session: README, ARCHITECTURE,
  the current build queue, the latest handoff, LAUNCH-CHECKLIST, DECISIONS (search, don't read).
- Archive candidates (verify each banner before moving): `OPUS-REVIEW-2026-08.md`, `FABLE-PLAN-2026-08.md`,
  `HANDOFF-2026-08-21.md`, `REDESIGN-PLAN.md`, `REVIEW-AND-LAUNCH-PLAN.md`, `MVP-AND-MONETISATION.md` (partly
  superseded — archive with its banner). Keep `BUILD-PLAN.md`, `ARCHITECTURE.md`, `FEATURE-MAP.md`, `FLO-BENCHMARK.md`,
  `ANDROID-LAUNCH.md`, `LAUNCH-CHECKLIST.md`, `GUARANI-REVIEW.md`, `SITE-PLAN-EMBARAZO-COM-PY.md`, both build queues,
  the 09-06 handoff and the 09-11 report in place. Fix relative links that break (`grep -rn 'docs/' docs README.md`).
- `tsconfig.json`: add `**/*.mts` to `include`; fix the two errors in `gen-guarani-review.mts` with a type guard,
  not a cast; run `npm run gen:guarani-review` and confirm `docs/GUARANI-REVIEW.md` is byte-identical (the drift
  test must stay green).

Exit: gates green; `npx tsc --noEmit` now covers `scripts/`; every link in `docs/INDEX.md` resolves; no file
content changed except the four named. Write `docs/log/w2.md`. Then continue per the run file.
