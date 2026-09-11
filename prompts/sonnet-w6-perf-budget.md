# Unit W6 — a perf budget script. SONNET session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`DECISIONS.md` section "PR-8 / K11" (the measured numbers and how they were taken), `scripts/gen-screenshots.mjs`
(how the repo drives a production server from a script), `package.json`. Execute under the autonomy protocol.

Owns: `scripts/perf.mjs` (new) · `package.json` (one `perf` script; `lighthouse` as a devDependency only if
`npx lighthouse` is not acceptable — prefer npx, no new dependency) · `docs/PERF.md` (new, ≤ 40 lines) · `docs/log/w6.md`.

Decision already made: the budget is a session gate, not a CI step. It runs against `next build && next start`
with the pre-installed Chromium (`/opt/pw-browsers/chromium` when present, else Lighthouse's own), mobile preset,
3 runs per URL, median reported.

Build:
- URLs: `/`, `/semana/20`, `/herramientas`, `/guias`. Budget: performance ≥ 90, LCP ≤ 3.5 s, CLS = 0, TBT ≤ 200 ms.
  Exit code 1 on any miss, with the failing metric and URL printed; a JSON summary written to a git-ignored
  `docs/perf/` folder (add the ignore).
- The LCP budget is the current fallback-hero reality, not the goal; `docs/PERF.md` says the goal moves to 2.5 s
  the day U10's renders land, and how to run the script.
- Record the baseline from this unit in the log (the four medians), so W4 can be judged against it.

Exit: gates green; `npm run perf` passes on `main` + your branch; `docs/PERF.md` explains the numbers in ≤ 40 lines.
Write `docs/log/w6.md`. Then continue per the run file.
