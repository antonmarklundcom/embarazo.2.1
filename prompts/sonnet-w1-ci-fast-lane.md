# Unit W1 — always-on CI fast lane. SONNET session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`.github/workflows/ci.yml`, `DECISIONS.md` section "PR-1 — K21 label-gated CI" only. Execute under the autonomy
protocol.

Owns: `.github/workflows/ci.yml` · `docs/log/w1.md`.

Decision already made: two jobs in the one workflow. `fast` runs on every `pull_request` (opened, synchronize,
reopened) and on push to `main`: checkout, setup-node with cache, `npm ci`, `npx tsc --noEmit`, `npm run lint`,
`npm test`, `npm run test:db` (if V3 merged — check `package.json`). No build, no browser, no `validate:content`.
`build` (the existing full job) keeps its label gate and its steps exactly as they are, including V3's line.

Build:
- Keep the concurrency group so a new push cancels the fast run in flight for the same ref.
- `timeout-minutes: 10` on `fast`. Comment the header the way the file already does: what each job is for and why
  the full job stays label-gated (K21's Actions-minutes argument still holds for the browser + build half).
- Do not touch branch protection (you cannot from the repo). Note in the log that `fast` is the check to mark
  required in repository settings — a founder step.
- Prove it: open the PR without the label first and confirm `fast` runs and is green on its own; then apply
  `run-ci` and confirm `build` runs too.

Exit: both jobs green on the PR; workflow file lints (`npx yaml-lint` is not installed — a syntax mistake shows as
a workflow that never triggers, so check the Actions tab). Write `docs/log/w1.md`. Then continue per the run file.
