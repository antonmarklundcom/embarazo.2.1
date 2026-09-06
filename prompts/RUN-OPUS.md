# Opus run — window 2 of 2. Build the foundation units, then everything that depends on them, then the link pass.

You are the OPUS window for the September 2026 queue. The Sonnet window (`prompts/RUN-SONNET.md`) has already
merged U4, U5 and optionally U8/U9 and recorded the founder's decisions — check `docs/BUILD-QUEUE-2026-09-06.md`
§11 and `docs/decisions-needed.md` §A before starting (defaults apply where blank).

Units, in this order, one PR each:
1. U1 `prompts/opus-u1-flags.md`
2. U6 `prompts/opus-u6-support-console.md` — only after U1 is merged (both add migrations)
3. U7 `prompts/opus-u7-week-hero.md`
4. U2 `prompts/sonnet-u2-ai-spend.md` — Sonnet-sized; you build it here to keep the founder at two windows
5. U3 `prompts/sonnet-u3-recomendados.md` — same
6. U10 `prompts/sonnet-u10-hero-assets.md` — only if the founder's renders exist in the repo (a `src/` folder
   under `public/assets/semanas/` or a branch named in `docs/decisions-needed.md`); otherwise skip and note it
7. U11 `prompts/sonnet-u11-link-pass.md` — always last; it is the only unit that edits shared pages and docs

Orientation (once): `docs/BUILD-QUEUE-2026-09-06.md` §2, §4, §7. Nothing else from `docs/` unless a unit prompt
names it.

Loop, for each unit: `git checkout main && git pull` → read the unit prompt and ONLY its listed files → build
under the autonomy protocol (§4), committing every 30 minutes → run every §4.3 gate in the session → push →
open the PR (`U<id> — <name>`, body ≤ 25 lines) → apply the `run-ci` label → fix and re-label until green →
merge (squash; auto-merge is off) → add the line to §11 (inside the PR) → next unit with a lean context (do not
re-read the plan or earlier logs unless the next prompt's Depends on names them).
If a unit's branch already exists on origin, continue it from the first unmet exit criterion.

Rules that override anything you infer while building:
- One unit per PR. Never bundle. Never start a unit on a branch containing another unit's work.
- Migrations are generated with `npm run db:generate` after `git pull`, never hand-written.
- Until U11: do not touch `app/(app)/page.tsx` beyond U7's prop plumbing, `app/(app)/ajustes/**`,
  `app/admin/page.tsx`, `DECISIONS.md` or `docs/BUILD-PLAN.md`.
- Stop only per §4.5: question → `docs/decisions-needed.md`, commit, push, end. Otherwise decide, log, continue.
- Never spawn sessions, subagents on other models, Routines or workflows. Nothing runs on Fable.
- If you cannot merge for lack of permission, stop with the PR URL rather than continuing on top of it.

Closing report after U11: merged PR numbers, skipped units and why, everything unanswered in
`docs/decisions-needed.md`, and the founder inputs from BUILD-QUEUE §8 still outstanding (renders, deploy env).
