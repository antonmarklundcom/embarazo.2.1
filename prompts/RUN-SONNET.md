# Sonnet run — window 1 of 2. Record the founder's decisions, then build every unit that needs no Opus work.

You are the SONNET window for the September 2026 queue. The Opus window runs after you and depends on nothing you
build; you depend on nothing it builds.

## Part A — decisions (10 minutes, in chat, before any code)
Follow `prompts/DECIDE.md` exactly, except: do it on branch `unit/decisions`, open its PR, apply `run-ci`, merge
when green, then continue below in this same window. If the founder is not answering within a few minutes,
say "defaults apply" and continue — no decision here blocks a build.

## Part B — build, in this order, one PR each
1. U4 `prompts/sonnet-u4-tool-depth.md`
2. U5 `prompts/sonnet-u5-ejercicios.md`
3. U8 `prompts/sonnet-u8-brand.md` — skip if B3 said no
4. U9 `prompts/sonnet-u9-ai-drafts.md` — skip if B4 said no

Do NOT build U2, U3, U10 or U11 — they depend on U1/U7 and belong to the Opus window.

Orientation (once): `docs/BUILD-QUEUE-2026-09-06.md` §2, §4, §7. Nothing else from `docs/` unless a unit prompt
names it.

Loop, for each unit: `git checkout main && git pull` → read the unit prompt and ONLY its listed files → build
under the autonomy protocol (§4), committing every 30 minutes → run every §4.3 gate in the session → push →
open the PR (`U<id> — <name>`, body ≤ 25 lines) → apply the `run-ci` label → fix and re-label until green →
merge (squash; auto-merge is off) → add the line to §11 (inside the PR) → next unit with a lean context.
If a unit's branch already exists on origin, continue it from the first unmet exit criterion.

Rules that override anything you infer:
- One unit per PR; never bundle; never build on top of an unmerged unit.
- Do not edit `app/(app)/page.tsx`, `app/(app)/ajustes/**`, `app/admin/page.tsx`, `DECISIONS.md` or
  `docs/BUILD-PLAN.md` — the link pass owns them. A wish for those goes as one line under "For the link pass"
  in `docs/decisions-needed.md`.
- Stop only per §4.5 (question → `docs/decisions-needed.md`, commit, push, end). Otherwise decide, log, go on.
- Never spawn sessions, Routines or workflows; Sonnet subagents only for a fan-out a unit prompt names. Nothing
  runs on Fable.
- If you cannot merge for lack of permission, stop with the PR URL rather than continuing on top of it.

Closing report: merged PR numbers, skipped units and why, unanswered items in `docs/decisions-needed.md`, and
the line "Opus window can start: paste `Read prompts/RUN-OPUS.md in this repo and execute it.`".
