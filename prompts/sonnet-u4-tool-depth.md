# Unit U4 — D7 tool depth: contractions 5-1-1 hint + kicks-history nudge. SONNET session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §2–§4 and §7, BUILD-PLAN.md D7 + C8, `docs/HANDOFF-2026-09-06.md`
§2 ("Go ahead on … D7"), `app/(app)/herramientas/contracciones/page.tsx`, `app/(app)/herramientas/pataditas/page.tsx`,
`lib/db.ts` (`contractionEntries`, `kickSessions`), `lib/tools/kegel.ts` + its test (the pure-module pattern).
Execute under the autonomy protocol (§4).

Owns: `lib/tools/contractions.ts` + `.test.ts` · `lib/tools/kicks.ts` + `.test.ts` ·
`app/(app)/herramientas/contracciones/**` · `app/(app)/herramientas/pataditas/**` · `e2e/tool-depth.spec.ts` ·
`docs/log/u4.md`.

Build:
- `assess511(entries, now)`: over the last 60 minutes, contractions ≈ every 5 min (interval ≤ 5 min average, ≥ 6
  contractions) lasting ≈ 1 min (median duration ≥ 45 s) → `{ pattern: "5-1-1" }`, else `null`. Pure, timezone-free,
  tolerant of an in-progress contraction. Hint copy (es-PY voseo): the pattern is reached, "es momento de llamar a tu
  sanatorio" with the existing sanatorio button — never "todo está bien" and never a diagnosis. Below 37 weeks, or
  with fewer entries, say nothing rather than reassure.
- `kickBaseline(sessions)`: median kicks-per-10-min over the last 7 *completed* sessions; `kickNudge(today,
  baseline)` returns a nudge only when ≥ 3 prior sessions exist and today's rate < 50 % of baseline: "menos que tu
  ritmo habitual — si te preocupa, consultá con tu sanatorio o andá a `/emergencia`". Same rule: silence, not
  reassurance, when data is thin.
- Both hints render under the existing generic disclaimer (`MedicalReviewByline` in disclaimer mode). The weight-gain
  band in D7 stays OUT (reviewer-gated per PR-19) — say so in your log.
- Guaraní: the two new safety-adjacent strings carry a jopara `gn` draft beside the Spanish, the way
  `lib/emergency.ts` does it; then add your module to `scripts/gen-guarani-review.mts` and regenerate
  `docs/GUARANI-REVIEW.md` with `npm run gen:guarani-review` (a test fails if the sheet drifts).
- Tests: unit (edge cases: gaps, one long contraction, sessions of 0 kicks); e2e seeds Dexie with a 5-1-1 hour and
  asserts the hint, then a thin history and asserts no nudge.

Exit: gates green (§4.3), both hints visible with seeded data and absent without, Guaraní sheet regenerated.
Open the PR that turn; write `docs/log/u4.md`. Spawn nothing.
