# Unit W7 — link pass for the improvement queue. SONNET session. Runs after every other unit in
`docs/BUILD-QUEUE-2026-09-11.md` has merged or been skipped.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1, §3, §7, every `docs/log/v*.md` and `docs/log/w*.md`,
`docs/decisions-needed.md` if it exists, `docs/INDEX.md`, `KNOWN-ISSUES.md`, `docs/BUILD-PLAN.md` "Standing rules".
Execute under the autonomy protocol.

Owns: `DECISIONS.md` (one appended entry) · `docs/BUILD-PLAN.md` (status lines and the standing-rules gate list) ·
`docs/BUILD-QUEUE-2026-09-11.md` §7 · `docs/INDEX.md` (status column) · `KNOWN-ISSUES.md` · `docs/log/w7.md`.

Do, in this order:
1. `DECISIONS.md`: one entry "2026-09-11 improvement queue" — for each merged V/W unit, two or three lines pointing
   at its log's Decisions section. Pointers, not prose.
2. `docs/BUILD-PLAN.md` "Standing rules": gate 2 now reads `tsc && lint && test && test:db && validate:content &&
   build`, and `npm run perf` before any PR that touches the home screen. Mark G3 partly done (budget script) with
   the W6 PR number.
3. `KNOWN-ISSUES.md`: promote still-open, cross-unit items from the V/W logs; close any the queue resolved.
4. `docs/INDEX.md`: mark both build queues and this pass's report as history now that the work is merged.
5. Fill §7 of the 09-11 queue with every unit's PR number. Run the full e2e suite once and `npm run perf` once.
6. `docs/decisions-needed.md`: anything unanswered stays; list it verbatim in the closing report.

Exit: gates green, full e2e green, docs consistent. Open the PR that turn; write `docs/log/w7.md`. Closing report to
the founder: what merged, what was skipped and why, what needs them (report §3), and the one-line state of the
`next-auth` 5 check from the Opus window.
