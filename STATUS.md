# STATUS: app.embarazo.com.py (Mi Bebé)

Updated: 2026-11-25 23:58 (Paraguay) by the manager session (Claude Fable 5.2; workers on Sonnet 5.5)

## State
waiting for Anton

## Done
- 2026-11-25: Baby Journey benchmark and build plan written: [docs/BABYJOURNEY-BENCHMARK-2026-11-25.md](docs/BABYJOURNEY-BENCHMARK-2026-11-25.md). Research only: no code, schema, deploy or production change.
- 2026-11-25: checkout unparked from E: to `C:\dev\embarazo.2.1` with `unpark.ps1` (32,176 files verified). The E: copy is kept as a snapshot. The old junction `C:\Claude 1\embarazo.2.1` is gone.
- 2026-11-25: `main` (`549705b`) built and run locally in device-only mode for screenshots and lab speed numbers. No tracked file changed.
- Earlier work: see `docs/NIGHT-RUN-2026-11-04.md` and the owner manual at `C:/operation manuals/embarazo.2.1/README.md`.

## Running now
Nothing.

## Needs Anton
Full list with detail: "Needs Anton" in the benchmark doc. The ones that unblock the most:
1. Confirm or correct the five scoping defaults (pregnancy plus baby years; visual changes yes; send Baby Journey screenshots; what you like most; what you will not build).
2. Find and contract a Paraguayan obstetra as named clinical reviewer `[COMPLETAR]`. This unlocks the food lookup, 42 weekly notes, symptom insights and prices that are already built.
3. Decide: may a visitor see her week before signing in? (Changes the account-first contract in `lib/auth`.)
4. Google Play organisation account (D-U-N-S).
5. Read `/admin/metricas` and note the funnel baseline; confirm production flags and that the push cron runs.
6. WhatsApp Business Platform cost for a weekly-message pilot `[COMPLETAR]`.
7. Review and merge the benchmark PR (doc and this file only).

## Still red
Nothing was built, so no gates were run for this change. The repo has no `npm run done`, `ready` or `secrets:check` yet (apps-lane gap list); `npm run verify` exists.

## Numbers
- Typed prompts: 2
- Anton minutes:
- Tokens (Claude output / Codex total): Codex not used
- Fix rounds: 0
- Day 30: impressions / leads

## Next step
After Anton's answers: phase 1 of the benchmark plan (remove dead ends and tighten Hoy; switch on reviewed content as approvals arrive; "ver mi semana" before sign-in if approved; start the Play paperwork).
