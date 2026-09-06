# Unit U11 — link pass. SONNET session. Runs after every other merged unit; the only unit that edits shared pages.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §4, §7, §11, every `docs/log/u*.md` that exists,
`docs/decisions-needed.md` if it exists, `app/(app)/page.tsx`, `app/(app)/ajustes/page.tsx`, `app/admin/page.tsx`.
Execute under the autonomy protocol (§4).

Owns: `app/(app)/page.tsx` · `app/(app)/ajustes/**` · `app/admin/page.tsx` · `DECISIONS.md` (one appended entry) ·
`docs/BUILD-PLAN.md` (status lines only) · `docs/HANDOFF-2026-09-06.md` §5 (one pointer line) ·
`docs/BUILD-QUEUE-2026-09-06.md` §11 · `KNOWN-ISSUES.md` · `e2e/home.spec.ts` (new or extended) · `docs/log/u11.md`.

Do, in this order, skipping any step whose unit did not merge:
1. Home: mount `RecomendadosRail` (U3) below the hero and above the article feed; it renders nothing while the
   flag is off, so the home e2e must pass in both states.
2. Ajustes: one row "Fondo de la semana" opening U7's theme sheet, and the fruit toggle, next to the language
   toggle. Read the preference through U7's hook — no second storage.
3. `/admin` home: cards/links for `/admin/flags` (U1), `/admin/ia` (U2) with U2's alert banner if U2 left it to
   you, and the U6 actions if they are not already reachable from a user page.
4. Verify every tools-grid tile (U5) and nav item resolves; run the full e2e suite once.
5. `DECISIONS.md`: one entry "2026-09 build queue" summarising each unit's Decisions section from its log — pointers,
   not prose. `BUILD-PLAN.md`: mark I1, I4, I5 (flag half), D6, D7, E4→Recomendados, hero as DONE with the PR numbers;
   fill §11 of the build queue. `KNOWN-ISSUES.md` (create it — it does not exist yet): promote only still-open, cross-unit items from the logs.
6. Read `docs/decisions-needed.md`; anything unanswered stays there — list it verbatim in your closing report.

Exit: gates green (§4.3), full e2e green, every merged unit reachable from the UI, docs consistent. Open the PR
that turn; write `docs/log/u11.md`. Closing report to the founder: what merged, what is parked, what needs them.
