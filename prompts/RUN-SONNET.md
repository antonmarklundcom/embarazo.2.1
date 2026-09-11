# Sonnet run — build every Sonnet unit in this window, one PR each, merged green, then the link pass.

> **Superseded 2026-09-11** — the remaining units run from `prompts/RUN-SONNET-2.md` (see `docs/BUILD-QUEUE-2026-09-11.md`). Kept for history.

You are the SONNET build window for the September 2026 queue. It starts after the Opus window has merged
U1, U6 and U7 (check `docs/BUILD-QUEUE-2026-09-06.md` §10; if U1 is not merged, stop and say so — U2 and U3
need it).

Units, in this order:
1. U4 `prompts/sonnet-u4-tool-depth.md`
2. U5 `prompts/sonnet-u5-ejercicios.md`
3. U2 `prompts/sonnet-u2-ai-spend.md`
4. U3 `prompts/sonnet-u3-recomendados.md`
5. U8 `prompts/sonnet-u8-brand.md` — skip if `docs/decisions-needed.md` says the founder wants to postpone the name
6. U9 `prompts/sonnet-u9-ai-drafts.md`
7. U10 `prompts/sonnet-u10-hero-assets.md` — only if the founder's renders exist in the repo (a `src/` folder
   under `public/assets/semanas/` or a branch named in `docs/decisions-needed.md`); otherwise skip and note it
8. U11 `prompts/sonnet-u11-link-pass.md` — always last

Orientation (once): read `docs/BUILD-QUEUE-2026-09-06.md` §2, §4, §7. Nothing else from `docs/` unless a unit
prompt names it.

Loop, for each unit: `git checkout main && git pull` → read the unit prompt and ONLY its listed files → build
under the autonomy protocol (§4), committing every 30 minutes → run every §4.3 gate in the session → push →
open the PR (`U<id> — <name>`, body ≤ 25 lines) → apply the `run-ci` label → fix and re-label until green →
merge (squash; auto-merge is off) → add the line to §10 (inside the PR) → next unit with a lean context.
If a unit's branch already exists on origin, continue it from the first unmet exit criterion.

Rules that override anything you infer:
- One unit per PR; never bundle; never build on top of an unmerged unit.
- Only U11 edits `app/(app)/page.tsx`, `app/(app)/ajustes/**`, `app/admin/page.tsx`, `DECISIONS.md`,
  `docs/BUILD-PLAN.md`. Every other unit that wants a change there writes one line in
  `docs/decisions-needed.md` under "for the link pass" instead.
- Stop only per §4.5 (question → `docs/decisions-needed.md`, commit, push, end). Otherwise decide, log, go on.
- Never spawn sessions, Routines or workflows; subagents on Sonnet are allowed only for the fan-out pattern a
  unit prompt names. Nothing runs on Fable.
- If you cannot merge for lack of permission, stop with the PR URL rather than continuing on top of it.

After U11 merges: closing report — merged PR numbers, skipped units and why, everything unanswered in
`docs/decisions-needed.md`, and the founder inputs from §8 that are still outstanding.
