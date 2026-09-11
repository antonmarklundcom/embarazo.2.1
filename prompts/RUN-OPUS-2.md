# Opus run 2 — build every Opus unit of the improvement queue in this window, one PR each, merged green, then stop.

You are the OPUS build window for the 2026-09-11 improvement queue. Units, in this order: **V1 → V2 → V3**
(`prompts/opus-v1-csp-enforce.md`, `prompts/opus-v2-sharing-backend-tests.md`, `prompts/opus-v3-dexie-tests.md`).
Nothing here depends on a Sonnet unit; the Sonnet window starts after you finish.

Orientation (once): read `docs/BUILD-QUEUE-2026-09-11.md` §1–§5 and `docs/BUILD-QUEUE-2026-09-06.md` §4. Do not
read the rest of `docs/` unless a unit prompt names a file. `docs/IMPROVEMENT-REPORT-2026-09-11.md` is the why; read
§2 of it only if a unit's decision seems wrong to you — then follow it anyway and log the objection.

Before V1, one check that takes a minute: `npm view next-auth dist-tags --json`. If `latest` is a 5.x stable
release, write "next-auth 5 stable: <version> — Next 16 + eslint 10 bump is now unblocked, needs its own Opus
unit" to `docs/decisions-needed.md` and continue; do not attempt the bump in this window.

Loop, for each unit:
1. `git checkout main && git pull && npm ci`. Read the unit's prompt file and ONLY the files it lists. If the branch
   `unit/<id>` already exists on origin, check it out and continue from the first unmet exit criterion.
2. Build under the autonomy protocol. Commit at least every 30 minutes.
3. Run every gate in the session (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run validate:content`,
   `npm run build`, the e2e specs the prompt names; from V3 on, `npm run test:db` too). Push only when all are clean.
4. Open the PR (title `V<n> — <name>`, body ≤ 25 lines: what, how verified, log file link). Apply the `run-ci`
   label. Wait for CI; if it fails, fix, push, remove and re-add `run-ci`.
5. When CI is green, merge (squash). Auto-merge is off, so you merge it yourself. If you lack permission to merge,
   stop and report the PR URL — do not start the next unit on top of an unmerged one.
6. Add the unit's line to `docs/BUILD-QUEUE-2026-09-11.md` §7 in the PR itself (before merging).
7. Continue with the next unit in a lean context.

Rules that override anything you infer while building:
- One unit per PR. Never bundle. Never build on a branch that contains another unit's work.
- Do not touch `app/(app)/page.tsx`, `app/(app)/ajustes/**`, `DECISIONS.md`, `docs/BUILD-PLAN.md`, `KNOWN-ISSUES.md`
  — those belong to the Sonnet units U11, W4 and W7.
- Stop only per §4.5: write the question to `docs/decisions-needed.md`, commit, push, end. Otherwise decide, log,
  continue.
- Never spawn sessions, subagents on other models, Routines or workflows. This window is the whole Opus lane.

When V3 is merged (or you are blocked): end with a closing report — merged PR numbers, the `next-auth` check
result, anything in `docs/decisions-needed.md`, and the line "Sonnet window can start: paste
`Read prompts/RUN-SONNET-2.md in this repo and execute it.`".
