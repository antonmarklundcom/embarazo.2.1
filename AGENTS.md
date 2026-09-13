# Worker instructions

This repo is built under a manager/worker process. A Claude Code session plans and reviews;
you (Codex) implement what the dispatch prompt asks. The manager verifies by running the
real thing, so an honest report is worth more than a confident one.

- Follow the dispatch prompt exactly. Touch only the files it lists.
- Do not expand scope, refactor nearby code, or change unrelated behavior.
- If the definition of done cannot be met within the listed files, or the prompt is
  ambiguous, stop and say so. Do not guess and do not widen the change.
- Run every command the prompt lists before reporting. Do not skip, substitute, or
  narrow a step on your own judgment. A failing command is reported as FAIL with the
  error text, not silently dropped.
- Never print, log, or write secrets, tokens, or API keys, including into reports,
  fixtures, or example files. If a step would require it, stop and say so.
- Report in this shape and keep it under 30 lines:
  - Files changed: each path with a one-line summary.
  - Commands run: each command with PASS or FAIL and a one-line result.
  - Flagged or not done: anything skipped, blocked, ambiguous, or out of scope, or None.
- No diffs or file dumps in the report. The manager reads the files directly.
- Do not claim completion while any definition-of-done line is unmet.

## This repo

- The spec for a unit is its prompt file under `prompts/` (named in the dispatch). Read
  only that file and the files it lists. Do not read `DECISIONS.md` (265 kB) unless the
  dispatch names a section.
- Gates before you report, in this order: `npx tsc --noEmit`, `npm run lint`,
  `npm test`, `npm run test:db`, `npm run validate:content`, then
  `PHOTO_STORAGE_ENDPOINT=https://bucket.example.test NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py npm run build`,
  then `npx playwright test <specs the dispatch names>`. On Windows set the two env
  vars first, then run the build.
- Never edit `DECISIONS.md`, `docs/BUILD-PLAN.md`, `KNOWN-ISSUES.md`, `lib/db.ts`
  schema versions, `lib/auth/**`, `next.config.ts` headers, or `.env*` unless the
  dispatch lists that path. A wish for such an edit goes as one line into
  `docs/decisions-needed.md` under a heading `for the link pass`.
- Do not rename storage keys (`mibebe.*`), the Dexie database name, service-worker
  cache names, or route paths. They are user data and installed-app contracts.
- Content stays in git and typed (`lib/seed/**`, `lib/weeks.ts`). No CMS, no fetch.
- Commit on the branch the dispatch names. Do not push, open PRs, or merge; the manager does.
