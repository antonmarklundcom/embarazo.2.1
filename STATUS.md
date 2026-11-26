# STATUS: app.embarazo.com.py (Mi Bebé)

Updated: 2026-11-26 14:40 (Paraguay) by the manager session (Claude Fable 5.2; workers on Opus 5.5 and Sonnet 5.5)

## State
working; several answers needed from Anton

## Done
- 2026-11-26: **Phase 1 item 1, dead ends removed** (PR 167, `main` `6e665ee`). Tool tiles with nothing behind them are hidden until their content is published (¿Puedo comer…?, ¿Cuánto cuesta?, Videos, "Así podría ser"); the "Pronto" tile is gone; links to the empty directory, food list and price list are hidden the same way; the week 20 tip no longer points at the directory; the onboarding label counts every screen ("Paso 2 de 7"); "Ahora no" is visible on the last onboarding step at 360x740; in baby mode `/semana` opens on the baby's age and the kick and contraction tiles are gone. Checks: 2074 unit tests, 90 e2e tests, build, all green in one run.
- 2026-11-26: **Country rule started** (this PR): [docs/CONTENT-COUNTRY-RULE.md](docs/CONTENT-COUNTRY-RULE.md), a line in `AGENTS.md`, the `lib/country` starting file, and a `validate:content` check that refuses a new JSON file directly under `lib/seed/`.
- 2026-11-25: Baby Journey benchmark and build plan: [docs/BABYJOURNEY-BENCHMARK-2026-11-25.md](docs/BABYJOURNEY-BENCHMARK-2026-11-25.md) (PR 165).
- 2026-11-25: checkout unparked from E: to `C:\dev\embarazo.2.1`. The E: copy is kept as a snapshot.
- Earlier work: see `docs/NIGHT-RUN-2026-11-04.md` and the owner manual at `C:/operation manuals/embarazo.2.1/README.md`.

## Running now
- Shorter Hoy **prototype** on the local branch `proposal/hoy-corto` (not pushed, not approved): week hero, "Hoy" with three things (next control, today's tip, mood), then sections that open on tap. Before/after screenshots at 360x740 go to Anton for a yes or no.

## Needs Anton
1. Scope: pregnancy plus the baby's first years, and visual changes allowed? (Recommended: yes to both.)
2. Anything already decided not to build, and what you like most in Baby Journey.
3. Screenshots or a screen recording of Baby Journey's onboarding and main tabs.
4. Clinical reviewer: a Paraguayan obstetra, registration number, and whether they will be the public face `[COMPLETAR]`. Unlocks the food lookup, 42 weekly notes, symptom insights and prices that are already built.
5. Decide: may a visitor see her week before signing in? (Changes the account-first contract in `lib/auth`; nothing is built until you say yes.)
6. Google Play organisation account (D-U-N-S).
7. WhatsApp Business Platform cost for a weekly-message pilot `[COMPLETAR]`, and whether Responde carries it.
8. Read `/admin/metricas` and send the funnel baseline, the `guarani` and `recomendados` flag states, and whether the push cron runs.
9. One real-phone test: sign in, open Hoy, a week and pataditas, switch to airplane mode, open them again.
10. Yes or no on the shorter Hoy, once the screenshots arrive.
11. "Así podría ser" (AI baby image) is switched off in production, so its tile is now hidden. If you switch it on, redeploy so the tile appears.
12. Should the build step in `C:\Claude 1\site-factory\models.yaml` change to Opus 5.5 at medium effort?

## Still red
- Nothing in the merged work.
- On this laptop: port 3000 is used by another app, so `npm run verify -- --e2e` tests the wrong server; e2e ran on port 3210 with a copy of the Playwright config. `lib/server/passwordReset.test.ts` times out at 5 s when the laptop is busy with other sessions and passes with a 30 s limit.
- The repo has no `npm run done`, `ready` or `secrets:check` yet (apps-lane gap list); `npm run verify` exists.

## Numbers
- Typed prompts: 3
- Anton minutes:
- Tokens (Claude output / Codex total): Codex not used
- Fix rounds: 1 (phase 1 item 1)
- Day 30: impressions / leads

## Next step
1. Anton's yes or no on the shorter Hoy; if yes, update the e2e suite and merge it.
2. If Anton approves question 5: "ver mi semana" before sign-in.
3. Baby mode wording that still talks about the pregnancy ("Diario de tu panza" on Hoy).
4. When the first approvals land in `lib/seed/approvals.json`, the food lookup and weekly notes switch on without new code.
