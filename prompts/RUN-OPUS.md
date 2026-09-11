# Opus run — build every Opus unit in this window, one PR each, merged green, then stop.

> **Finished 2026-09-07** (U1, U6, U7 merged). The next Opus window is `prompts/RUN-OPUS-2.md`.

You are the OPUS build window for the September 2026 queue. Units, in this order: **U1 → U6 → U7**
(`prompts/opus-u1-flags.md`, `prompts/opus-u6-support-console.md`, `prompts/opus-u7-week-hero.md`).
Nothing here depends on a Sonnet unit; the Sonnet window starts after you finish.

Orientation (once): read `docs/BUILD-QUEUE-2026-09-06.md` §2, §4, §7. Do not read the rest of the docs
folder unless a unit prompt names a file.

Loop, for each unit:
1. `git checkout main && git pull`. Read the unit's prompt file and ONLY the files it lists. If the branch
   `unit/<id>` already exists on origin, check it out and continue from the first unmet exit criterion.
2. Build under the autonomy protocol (§4). Commit at least every 30 minutes.
3. Run every gate in §4.3 in the session. Push only when all are clean.
4. Open the PR (title `U<id> — <name>`, body ≤ 25 lines: what, how verified, log file link). Apply the
   `run-ci` label. Wait for the CI check to finish; if it fails, fix, push, remove and re-add `run-ci`.
5. When CI is green, merge the PR (squash). Auto-merge is off, so you merge it yourself. If you lack
   permission to merge, stop and report the PR URL — do not start the next unit on top of an unmerged one.
6. Add the unit's line to `docs/BUILD-QUEUE-2026-09-06.md` §10 in the PR itself (before merging).
7. Continue with the next unit in a lean context: do not re-read the plan or previous unit logs unless the
   next prompt's Depends on names them.

Rules that override anything you infer while building:
- One unit per PR. Never bundle units. Never start a unit on a branch that contains another unit's work.
- U6 starts only after U1 is merged (both add Drizzle migrations; generate U6's with `npm run db:generate`
  after `git pull`, never by hand).
- Stop only per §4.5: write the question to `docs/decisions-needed.md`, commit, push, end. Otherwise decide,
  log, continue.
- Do not touch `app/(app)/page.tsx` beyond U7's prop plumbing, `app/(app)/ajustes/**`, `DECISIONS.md` or
  `docs/BUILD-PLAN.md` — those belong to the Sonnet link pass.
- Never spawn sessions, subagents on other models, Routines or workflows. This window is the whole Opus lane.

When U7 is merged (or you are blocked): end with a closing report — merged PR numbers, anything in
`docs/decisions-needed.md`, and the line "Sonnet window can start: paste `Read prompts/RUN-SONNET.md in this
repo and execute it.`".
