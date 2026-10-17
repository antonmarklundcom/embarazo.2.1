# Twenty improvements — 17 October 2026

Follow-up to [LAUNCH-READINESS-2026-10-16.md](LAUNCH-READINESS-2026-10-16.md). Branch `codex/improvements-20261017` from main `1acd28f` (PR150).

- **Owner approval:** Anton approved all twenty in chat.
- **Who did what:** Haiku 5.5 and Sonnet 5.5 subagents took the scoped items on separate files. Claude Opus 5.5 did the design, security and accessibility items, then reviewed every subagent change and ran all the gates.

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Service worker handles `pushsubscriptionchange` | Done. The server carries owner, opt-ins and unsent reminders to the new endpoint. | `app/sw.ts`, `app/api/v1/push/rotate/route.ts`, `rotateSubscription` in `lib/server/push.ts` |
| 2 | No "No pudimos comprobar tu cuenta" flash while redirecting | Done. The revoke event and cancelled checks are ignored once the page is leaving. | `components/AccountEntryGate.tsx`, e2e regression in `account-entry.spec.ts` |
| 3 | Push health in admin | Done, read-only, counts only | `/admin/avisos`, `lib/server/pushHealth.ts` |
| 4 | Flaky e2e | Five races fixed: welcome IndexedDB, rechecks counting, symptom text, weekly opt-in and the notification-test bounds. The date-dependent specs are explained below. | `e2e/*` |
| 5 | One local verify command | Done | `npm run verify` (`scripts/verify-all.mjs`) |
| 6 | Dependabot majors | Done in PR150: safe updates merged, blocked majors ignored | `.github/dependabot.yml` |
| 7 | `.mts` scripts type-checked | Already true: `tsconfig` includes `**/*.mts`, and the Guaraní generator's union is already narrowed. No change needed. | — |
| 8 | PIN card extraction (W4) | Done | `components/ajustes/PinSettings.tsx` |
| 9 | Duplicate-pregnancy contract in the type | Done. `DuplicatePregnancyError` is translated from MySQL `ER_DUP_ENTRY`/1062, so a non-duplicate error is no longer mistaken for the race. Not tested against real MySQL. | `lib/server/sharingBackend.ts` |
| 10 | Offline tools as the README promised | Done. The síntomas, diario, fotos, peso and checklist pages are precached. | `app/sw.ts` `pageRoutes` |
| 11 | Internal Recomendados links in the same tab | Done, still counted via `/api/v1/go` | `components/RecomendadoCard.tsx` |
| 12 | Share card follows the chosen theme | Done; with no choice it keeps the trimester pastel | `lib/share/draw.ts`, `components/ShareCard.tsx`, `useChosenHeroTheme` |
| 13 | Blocked avatar falls back | Done. The `onError` path itself cannot run under the node-only vitest. | `components/AccountCard.tsx` |
| 14 | Signed-in users skip "Listo, ya entraste" | Done in both directions; the step count excludes it | `components/Onboarding.tsx`, `lib/onboarding/progress.ts` |
| 15 | Hoy repeats the size twice | Done. The card under the hero shows only foot and hand and hides when there are none. | `components/SizeTabs.tsx` (`limbsOnly`) |
| 16 | Automated accessibility check | Done. `@axe-core/playwright` 4.14 is a dev dependency. Findings fixed: contrast in 8 places, 4 unlabelled Ajustes controls, guide-card names. | `e2e/a11y.spec.ts` |
| 17 | `/semana/20` layout shift | Already fixed. Live `/semana/15`, `/20` and `/30` measured CLS 0 on mobile and desktop, 17 Oct 00:5x UTC. No change. | — |
| 18 | Support address check | Done as a build **warning**, never a failure, because routing lives in Cloudflare. Owner still has to route `hola@` or switch to `soporte@`. | `lib/launchChecks.ts` |
| 19 | Link to nombres.com.py | Done behind flag `nombres_link`, default **off**. Turn it on in `/admin/flags` once the site is live. | `components/NombresLink.tsx` |
| 20 | AVIF MIME type and image caching | Done as `public/assets/.htaccess`, scoped to `/assets` and wrapped in `IfModule`. It only takes effect if Hostinger's LiteSpeed reads `.htaccess` in that folder; verify after deploy. | `public/assets/.htaccess` |

## Validation

Local checks, all passing:
- TypeScript and full lint: pass.
- Unit tests: **1789/1789**.
- IndexedDB tests: 122/122.
- Content: 19 files.
- Production build: pass.

Browser, full suite: 241 tests.
- The first full run passed 225/241. That surfaced the real axe findings, the account-step change breaking the shared onboarding helper, and the remaining flash path. All of them are now fixed.
- The final full run, in the local timezone, passed **235/241**. The six failures break down as:
  - **Four date specs** (family-surfaces, new-week, size-tabs, weekly-line). They build dates with `toISOString()` (UTC) while the app reads local time, so they fail between 21:00 and 24:00 in Paraguay. With the browser in UTC they passed **11/11**. None of these specs' date logic was changed.
  - **Two notification-timing cases**, which passed on rerun. Their bounds now follow the client's own 6-second service-worker wait. One more first-load miss on the weekly opt-in (service worker not ready within 6 s right after a fresh build) also passed on rerun. This is the same flake the PR146 release recorded.

Logs are in `E:/ai work/Artifacts/embarazo.2.1/2026-10-17/improvements`, including every failing run; screenshots are in `screens/`.

## Not verified here

- Real MySQL behaviour of the push-health SQL and of the duplicate-key translation (#3, #9).
- A real browser firing `pushsubscriptionchange` (#1).
- Whether LiteSpeed applies `public/assets/.htaccess` (#20).
- Android delivery.

All of these need the deployed app, the production database, or the owner's phone.
