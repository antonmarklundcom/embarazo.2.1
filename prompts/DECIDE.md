# Decide — record the founder's answers. SONNET session, ~10 minutes, no code.

Read `docs/decisions-needed.md` and `docs/BUILD-QUEUE-2026-09-06.md` §2. Then ask the founder the questions in
`decisions-needed.md` **one section at a time** (A, then B, then C), showing each default, and accept short answers
("default", "yes", "no", a name). Do not argue with an answer; if one contradicts a locked decision in
BUILD-QUEUE §2 ("Decisions already made"), say so in one sentence and ask again.

When all are answered (or the founder says "defaults for the rest"):
1. Fill every "Answer:" line in `docs/decisions-needed.md`.
2. Update the matching bullets in `docs/BUILD-QUEUE-2026-09-06.md` §2 so the text states the chosen option
   (remove the "(Assumed …)" notes).
3. If B1 changed the name, edit the defaults in `prompts/sonnet-u8-brand.md`. If A2 changed the theme list, edit
   the list in `prompts/opus-u7-week-hero.md`. If B3/B4 said no, mark the unit "skipped by founder" in the §5 table.
4. Commit on branch `decisions/2026-09`, push, open a PR titled "Founder decisions, September 2026", apply the
   `run-ci` label, merge when green (docs only). Report what changed.

Do not start any build unit from this window.
