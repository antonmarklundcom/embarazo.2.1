# Codex dispatch files

One per unit of `docs/PLAN-2026-09-13-GO-LIVE.md` §2.2. Filled instances of the
`manager-worker-codex` dispatch template. The manager (Fable, interactive window)
checks the `Files to touch` block against the ownership map, then runs:

    codex-run.ps1 -Repo <path> -Tier <tier from line 1> -PromptFile prompts\codex\<unit>.txt

No double quotes may appear in these files (the Windows wrapper breaks). Verified
by `lib/invariants/codexPrompts.test.ts`.
