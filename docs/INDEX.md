# Docs index

The entrance to `docs/`. If you are starting a new session, read these six in
order and stop — everything else is reference you pull in when a task
actually needs it:

1. [`README.md`](../README.md) — what the app is and how to run it.
2. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — the data contract; read §4 in
   full before writing any code that touches storage, sync or accounts.
3. [`docs/PLAN-2026-09-13-GO-LIVE.md`](PLAN-2026-09-13-GO-LIVE.md) — the
   current build queue and the go-live runbook.
4. [`docs/HANDOFF-2026-09-06.md`](HANDOFF-2026-09-06.md) — the latest
   handoff: what shipped, what the founder decided, what's queued.
5. [`docs/LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) — the one ordered list
   of what's left before a public launch.
6. [`DECISIONS.md`](../DECISIONS.md) — the append-only decision log.
   **Search it, don't read it end to end** (265 kB); it grows forever by
   design.

Superseded plans move to `docs/archive/` with their banner notes intact —
the banner still tells you what replaced them and why. Nothing under
`docs/archive/` is deleted or rewritten.

## Everything in `docs/`

| File | Status | Read when | Superseded by |
|---|---|---|---|
| [`docs/INDEX.md`](INDEX.md) | current | you don't know where to start | — |
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | current | before writing any code; §4 is the data contract | — |
| [`docs/BUILD-PLAN.md`](BUILD-PLAN.md) | current | task-level detail for phased engineering work | — |
| [`docs/FEATURE-MAP.md`](FEATURE-MAP.md) | current | tracing a Preggers-benchmarked item to its task | — |
| [`docs/FLO-BENCHMARK.md`](FLO-BENCHMARK.md) | current | the Flo benchmark behind monetisation/engagement calls | — |
| [`docs/ANDROID-LAUNCH.md`](ANDROID-LAUNCH.md) | current | planning the Play Store / TWA packaging phase | — |
| [`docs/SITE-PLAN-EMBARAZO-COM-PY.md`](SITE-PLAN-EMBARAZO-COM-PY.md) | current | content/SEO/architecture reference for the marketing site (the Next.js build in §2/§7/§8 is superseded — the founder is hand-building it as static HTML/PHP outside this repo) | — |
| [`docs/LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) | current | the running order of what's left before public launch | — |
| [`docs/GUARANI-REVIEW.md`](GUARANI-REVIEW.md) | current (generated) | handing the Guaraní sheet to a native-speaker reviewer; regenerate with `npm run gen:guarani-review`, never edit by hand | — |
| [`docs/BUILD-QUEUE-2026-09-06.md`](BUILD-QUEUE-2026-09-06.md) | current | the September queue's original unit breakdown and ownership rules (§4 autonomy protocol still applies) | — |
| [`docs/BUILD-QUEUE-2026-09-11.md`](BUILD-QUEUE-2026-09-11.md) | current | the improvement-pass units' ownership map, which still applies | — |
| [`docs/IMPROVEMENT-REPORT-2026-09-11.md`](IMPROVEMENT-REPORT-2026-09-11.md) | current | the *why* behind the 09-11 build queue's units | — |
| [`docs/PLAN-2026-09-13-GO-LIVE.md`](PLAN-2026-09-13-GO-LIVE.md) | current | the build queue right now, and the path from `main` to a live URL | — |
| [`docs/HANDOFF-2026-09-06.md`](HANDOFF-2026-09-06.md) | current | the latest "what shipped / what's next" handoff | — |
| [`docs/log/`](log/) (`u1`–`u7`, `v1`–`v3`, `w2`, …) | history | auditing what a specific build unit actually did, one file per unit | — |
| [`docs/archive/OPUS-REVIEW-2026-08.md`](archive/OPUS-REVIEW-2026-08.md) | history | background on the August review that reprioritised the launch plan | `docs/BUILD-PLAN.md`, `docs/archive/FABLE-PLAN-2026-08.md` |
| [`docs/archive/FABLE-PLAN-2026-08.md`](archive/FABLE-PLAN-2026-08.md) | history | background on the account-first/family-first pivot decision | `docs/archive/HANDOFF-2026-08-21.md` and later handoffs for what actually shipped |
| [`docs/archive/HANDOFF-2026-08-21.md`](archive/HANDOFF-2026-08-21.md) | history | background on the K-batch (PR-1–PR-11) | `docs/HANDOFF-2026-09-06.md` |
| [`docs/archive/REDESIGN-PLAN.md`](archive/REDESIGN-PLAN.md) | history | background on the "Mi Bebé" visual-language tokens (already applied) | — (tokens are live in the Tailwind config; this is the historical rationale) |
| [`docs/archive/REVIEW-AND-LAUNCH-PLAN.md`](archive/REVIEW-AND-LAUNCH-PLAN.md) | history | background on the original July 2026 review; §4's founder task list is still cited elsewhere as current for data/content/legal work | `docs/BUILD-PLAN.md` (§3, the plan) |
| [`docs/archive/MVP-AND-MONETISATION.md`](archive/MVP-AND-MONETISATION.md) | history | background on the pre-pivot MVP cut line; §3 monetisation and §4 acquisition are still cited as in force | `docs/archive/FABLE-PLAN-2026-08.md` (§2, the cut line) |

## Root-level docs (not under `docs/`)

| File | Status | Read when | Superseded by |
|---|---|---|---|
| [`README.md`](../README.md) | current | first stop: what the app is, env vars, local dev, deployment | — |
| [`DECISIONS.md`](../DECISIONS.md) | current | looking up why a specific call was made; append-only, search by keyword | — |
| [`AGENTS.md`](../AGENTS.md) | current | dispatching or picking up a worker unit; the rules a worker follows | — |
