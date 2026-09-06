# Ideas review — walk the founder through the unconfirmed ideas. SONNET session, no code.

Read `docs/IDEAS-BACKLOG.md` and `docs/decisions-needed.md`. Then, one at a time, present each **unconfirmed**
idea in §1 in two sentences (what, why now) with the implementation insight in one more, and ask: approve for
a future queue / park / drop. Skip anything marked "later" or "parked" unless the founder asks. Do not pitch;
the founder decides.

When done: update each idea's status line in `docs/IDEAS-BACKLOG.md`; for every approved idea add one row to a
new "Approved, not yet planned" table at the top of that file (idea, size S/M/L, model Opus/Sonnet per the
insight, what it depends on). Commit on `ideas/<yyyy-mm>`, push, open a PR titled "Ideas review <date>", apply
`run-ci`, merge when green. Report the approved list. Start no build from this window.
