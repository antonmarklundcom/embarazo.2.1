# Sonnet run 2 — finish the September queue, then build every Sonnet unit of the improvement queue, one PR each.

You are the SONNET build window for the 2026-09-11 improvement queue. It starts after the Opus window has merged
V1, V2 and V3 (check `docs/BUILD-QUEUE-2026-09-11.md` §7; if V2 is not merged, W5 must be skipped and noted — do
not stop for it).

Units, in this order:
1. U3 `prompts/sonnet-u3-recomendados.md`
2. U8 `prompts/sonnet-u8-brand.md` — skip if `docs/decisions-needed.md` says the founder wants to postpone the name
3. U9 `prompts/sonnet-u9-ai-drafts.md`
4. U10 `prompts/sonnet-u10-hero-assets.md` — only if renders exist (`public/assets/semanas/src/` or a branch named in
   `docs/decisions-needed.md`); otherwise skip and note it
5. U11 `prompts/sonnet-u11-link-pass.md` — the September link pass; runs before any W unit
6. W1 `prompts/sonnet-w1-ci-fast-lane.md`
7. W2 `prompts/sonnet-w2-docs-index.md`
8. W3 `prompts/sonnet-w3-a11y-contrast.md`
9. W6 `prompts/sonnet-w6-perf-budget.md` — before W4, so the split is judged against a baseline
10. W5 `prompts/sonnet-w5-server-backend-tests.md` — needs V2 merged
11. W4 `prompts/sonnet-w4-split-home-ajustes.md` — needs U11 merged
12. W7 `prompts/sonnet-w7-link-pass.md` — always last

Orientation (once): read `docs/BUILD-QUEUE-2026-09-11.md` §1–§5 and `docs/BUILD-QUEUE-2026-09-06.md` §2, §4, §7.
Nothing else from `docs/` unless a unit prompt names it.

Loop, for each unit: `git checkout main && git pull && npm ci` → read the unit prompt and ONLY its listed files →
build under the autonomy protocol, committing every 30 minutes → run every gate in the session (`tsc`, `lint`,
`test`, `test:db`, `validate:content`, `build`, the named e2e; `npm run perf` once W6 exists and the unit touches
the home screen) → push → open the PR (`<id> — <name>`, body ≤ 25 lines) → apply `run-ci` → fix and re-label until
green → merge (squash; auto-merge is off) → add the line to the queue's index (§10 of the 09-06 file for U units,
§7 of the 09-11 file for W units) inside the PR → next unit with a lean context. If a unit's branch already exists
on origin, continue it from the first unmet exit criterion.

Rules that override anything you infer:
- One unit per PR; never bundle; never build on top of an unmerged unit.
- Only U11 and W4 edit `app/(app)/page.tsx` and `app/(app)/ajustes/**`; only U11 and W7 edit `DECISIONS.md`,
  `docs/BUILD-PLAN.md`, `KNOWN-ISSUES.md`. Every other unit that wants a change there writes one line in
  `docs/decisions-needed.md` under "for the link pass" instead.
- Stop only per §4.5 (question → `docs/decisions-needed.md`, commit, push, end). Otherwise decide, log, go on.
- Never spawn sessions, Routines or workflows; subagents on Sonnet only for the fan-out a unit prompt names (W5).
  Nothing runs on Fable.
- If you cannot merge for lack of permission, stop with the PR URL rather than continuing on top of it.

After W7 merges: closing report — merged PR numbers, skipped units and why, everything unanswered in
`docs/decisions-needed.md`, and the founder inputs from the report §3 that are still outstanding.
