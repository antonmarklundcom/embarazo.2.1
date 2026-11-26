# STATUS: app.embarazo.com.py (Mi Bebé)

Updated: 2026-11-26 21:30 (Paraguay) by the manager session (Claude Fable 5.2; workers on Opus 5.5, one on Sonnet 5.5)

## State
waiting for Anton

## Done
All merged to `main` and deployed on 26 November 2026 unless a line says otherwise. Every PR: DB none.
- **Dead ends removed** (PR 167): empty tool tiles hidden until their content is published, no "Pronto" tile, links to the empty directory, food list and price list hidden the same way, onboarding label counts every screen, "Ahora no" visible on the last step, baby mode no longer shows a pregnancy week or the kick and contraction tiles.
- **Country rule** (PR 168): [docs/CONTENT-COUNTRY-RULE.md](docs/CONTENT-COUNTRY-RULE.md); new content goes in `lib/seed/shared/` or `lib/seed/py/`, new Paraguay facts in `lib/country/py.ts`, new screen text in `lib/i18n/es-PY/`; `validate:content` refuses a new JSON file directly under `lib/seed/`.
- **Family line and partner wording** (PR 170): 42 weekly lines for la abuela, la tía, la madrina under "Para la familia"; "tu pareja o quien te acompaña" on five prompts.
- **Shorter Hoy** (PR 171): week hero, "Hoy" (next control, tip, mood), stories, then five rows that open on tap. 2,151 px at 360x740, was 4,601. The weekly push opens the "Tu semana" row and the mimo push opens "Acompañada".
- **Para conversar and checklist by trimester** (PR 172): 36 question cards at `/herramientas/conversar`; the Checklist tab gets "Por trimestre", built from the existing week tips.
- **Play listing** (PR 173): listing text checked against the app, eight phone screenshots in `android/store-listing/screenshots/`, install-sheet screenshots regenerated. Nothing submitted.
- **Pregunta del día and mood follow-up** (PR 174, `main` `6647f95`): one question a day with "Así respondieron otras mamás" once 30 answers exist for her trimester; 45 questions in `lib/seed/py/dailyQuestions.json`; answers counted through the existing anonymous counter. **Switched off**: flag `pregunta_del_dia`. After a good or ordinary mood the mood row offers one link (photo diary or diary).
- 2026-11-25: Baby Journey benchmark and build plan: [docs/BABYJOURNEY-BENCHMARK-2026-11-25.md](docs/BABYJOURNEY-BENCHMARK-2026-11-25.md) (PR 165). Checkout unparked from E: to `C:\dev\embarazo.2.1`.
- Earlier work: `docs/NIGHT-RUN-2026-11-04.md` and the owner manual at `C:/operation manuals/embarazo.2.1/README.md`.

## Running now
Nothing.

## Needs Anton
For a soft launch on the web:
1. One real-phone test: sign in on a cheap Android, open Hoy, a week and pataditas, switch to airplane mode, open them again. Also: Ajustes → Avisos → test notification with the app closed. The Play short description says "Funciona sin internet"; it must be true before the listing is pasted.
2. A monitored e-mail for support and deletion requests (`NEXT_PUBLIC_SUPPORT_EMAIL` on Hostinger); check sign-up and reset mail lands in the inbox.
3. Confirm Hostinger backs up the database; keep one export elsewhere.
4. Read `/admin/metricas` and note the funnel baseline, the `guarani` and `recomendados` flag states, and whether the push cron runs.
5. Read the 45 daily questions (`lib/seed/py/dailyQuestions.json`) and switch on `pregunta_del_dia` in `/admin/flags` if you like them. Results appear after 30 answers per trimester; say if you want another number.

For Google Play (full list: `docs/PLAY-STORE-SUBMISSION.md`, "Still needed from the owner"):
6. D-U-N-S number and the Play organisation account (1 to 4 weeks; start first).
7. Signing key and fingerprints; IARC rating; health apps declaration; lawyer review of privacy and terms; feature graphic and icon; app name (middle dot in the app, dash suggested in the launch checklist).

To make the app worth promoting:
8. Clinical reviewer: a Paraguayan obstetra, registration number, and whether they will be the public face `[COMPLETAR]`. Unlocks the food lookup, 42 weekly notes, symptom insights and prices that are already built.
9. Decide: may a visitor see her week before signing in? (Changes the account-first contract in `lib/auth`; nothing is built until you say yes.)
10. Go-ahead to draft weekly content in three voices, more guides and the baby's first year, hidden until the reviewer signs.
11. "Quien te acompaña" only for single mothers needs a new onboarding question and a new profile field (stored user data). Yes or no.

Smaller:
12. Baby Journey screenshots (onboarding and main tabs), before any larger restyle.
13. WhatsApp Business Platform cost for a weekly-message pilot `[COMPLETAR]`.
14. "Así podría ser" (AI baby image) is switched off in production, so its tile is hidden. If you switch it on, redeploy so the tile appears.
15. Should the build step in `C:\Claude 1\site-factory\models.yaml` change to Opus 5.5 at medium effort?
16. In the hero, a "Detalles de la semana" button shows where the per-person card was. Say if you want it gone.

## Still red
- Nothing in the merged work.
- On this laptop: port 3000 is used by another app, so `npm run verify -- --e2e` tests the wrong server. e2e runs with the config copies in `C:/dev/.cache/embarazo.2.1/e2e/` (ports 3210 and 3211). `lib/server/passwordReset.test.ts` can time out at 5 s when the laptop is busy and passes with a 30 s limit.
- The daily question's count is sent once; an answer given offline is kept on the phone but not counted (the existing view counter behaves the same).
- The repo has no `npm run done`, `ready` or `secrets:check` yet (apps-lane gap list); `npm run verify` exists.

## Numbers
- Typed prompts: 12
- Anton minutes:
- Tokens (Claude output / Codex total): Codex not used
- Fix rounds: 1 (PR 167)
- Day 30: impressions / leads

## Next step
1. Anton's phone test and answers above.
2. Buildable without him: a `ready` command (secrets, database, legal pages), baby-mode wording that still talks about the pregnancy ("Diario de tu panza").
3. On his yes: content drafts hidden until reviewed; "ver mi semana" before sign-in.
4. When the first approvals land in `lib/seed/approvals.json`, the food lookup and weekly notes switch on without new code.
