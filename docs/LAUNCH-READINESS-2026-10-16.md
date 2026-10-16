# Launch readiness — 16 October 2026

Branch `codex/launch-readiness-20261016`, from main `a77eece` (PR146, design and realistic images, deployed). Reviewer: Claude Opus 5.5. This note records what was found, what this branch changes, and what is still open. It supersedes nothing in the owner manual; deployment and device status live there.

## What this branch changes

1. **Next.js 15.5.27 → 15.5.28** (`eslint-config-next` to match; only the twelve `next`/`@next/*` lockfile entries change). Fixes GHSA-p3m5-59mp-jv5r (high): Server Actions CPU denial of service, which applies because sign-in, settings and admin use Server Actions. The same release raises the sharp floor for GHSA-2464-fhr4-w9xw (critical image-optimizer RCE); the lockfile already resolved sharp 0.35.5, the documented mitigation. `npm audit` did not list either advisory at review time.
2. **"Probar avisos" in Ajustes → Avisos.** Two buttons, *Probar con la app cerrada* (20 s delay) and *Enviar ahora*, ask `POST /api/v1/push/test` for one body-less poke to this device's stored subscription. The route requires a session, refuses another account's endpoint or account header, whitelists the endpoint host, is throttled to 3 per minute per account and queues nothing in the database. The page leaves a short-lived marker in its own Cache Storage entry (`mibebe-push-test`), so the service worker words that push as *Mi Bebé: aviso de prueba*; the marker is consumed on the next push either way. Tapping opens `/ajustes?avisos=prueba`, which confirms the tap. After *Desactivar avisos* the subscription row is deleted, so the server refuses a test. No schema, category, cache-name or route-rule change.
3. **Onboarding clarity.** After the first question each step shows *Paso N de M* with a progressbar, counted over the steps this person will actually see. The large welcome heading and the account note now appear on the first screen and next to the account step only. Finishing setup marks the starting week as seen, so the first Hoy does not show a *Semana nueva* card for a turnover she has not had (later weeks show it as before). Steps, answers, storage and calculations are unchanged.
4. **Returning-user sign-in copy.** *Ya tengo una cuenta* and a returning device open `/cuenta?ingreso=1&vuelvo=1`: *Volvé a tu embarazo*, *Entrar con Google*, and a line saying the health-data permission is asked at every sign-in. Consent stays unchecked and required; server actions, the Auth.js callback and `returnTo` validation are untouched.

## Validation on this branch

TypeScript and full ESLint pass. The full unit run passed **1746/1746** with two workers and no auth timeouts; the database suite passed 122/122, content validation 19 files, and the production build passed on Next 15.5.28. After the last test-only commit, the touched unit areas passed 146/146 and lint passed again.

Browser runs: the first targeted run passed **58/60**. Both failures were new tests with wrong assumptions:
- The headless shell refuses notifications, so that test now runs in full Chromium in its own file.
- The local preview has no sign-in provider, so the consent check moved to the component test.

A rerun hit two timing failures that had passed in the first run:
- A 5 s wait was shorter than the push client's own 6 s service-worker bound; it now waits 15 s.
- A pre-existing welcome test raced Dexie's store creation.

After those fixes, a serial rerun passed 12/12 and the final parallel targeted run passed **60/60**. That run covered push-test, push-test-sw, onboarding-progress, new-week, welcome, onboarding, onboarding-avisos, account-entry, home, sw-idb, offline, security-headers and design-shell. All logs are kept in the external evidence folder, failures included.

## Dependency audit triage (11 findings: 5 moderate, 6 high)

| Chain | Severity | Reachable? | Action |
|---|---|---|---|
| `drizzle-kit` → `@esbuild-kit/*` → `esbuild` ≤0.24.2 (GHSA-67mh-4wv8-2f99) | 5 moderate | No. Dev-server CORS; drizzle-kit never starts esbuild's server, and it is not part of the runtime. | None. The only "fix" offered is a downgrade. |
| `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm) | 5 high | No. Stack exhaustion while linting our own globs; development only. No patched `braces` exists. | None. Fix offered is a downgrade to 14.x. |
| `next` → nested `postcss` 8.4.31 (four sourceMappingURL/stringify advisories) | 1 high + parent moderate | No. Needs attacker-controlled CSS or source maps at build time; we only build our own CSS. Every 15.5.x pins 8.4.31. | Waits for Next 16, which waits for `next-auth` v5 stable. Do not override the pin blindly. |

Dependabot PR137 bundles major upgrades (TypeScript 7, ESLint 10, Vitest 5, eslint-config-next 16, @types/node 26) and should not be merged as a group. PR136 (react-query, drizzle-orm, mysql2 patch/minor) is a separate, reviewable bump; this branch did not take it.

## AVIF content type (investigated, not changed)

Hostinger's LiteSpeed front end serves files under `public/` directly, without the app's headers: AVIF comes back as `text/plain`, and static files carry no `Cache-Control` or `nosniff`. Chromium decodes the images, and `<picture>` chooses sources by the `type` attribute, so the visible impact is nil. The fix would be a server MIME mapping (`AddType image/avif .avif`). A repository `.htaccess` could replace Hostinger's own proxy rules, so make that change only after reading the live site root through hPanel's file manager.

## Live review evidence (anonymous, read-only)

- Throttled 4G with 4× CPU against production: LCP 1.7–2.5 s, CLS 0 on `/cuenta`, `/semana/15` and `/guias`. A fresh visit to `/` reaches the welcome in 1.0–2.7 s.
- Local preview (`AUTH_REQUIRE_ACCOUNT=false`): 10 taps or inputs over 8 onboarding screens to reach Hoy. Screenshots are in the external evidence folder `E:/ai work/Artifacts/embarazo.2.1/2026-10-16/launch-review`.

## Still open — owner actions

1. **Deletion and privacy address.** `/borrar-cuenta`, `/privacidad` and `/terminos` publish `hola@embarazo.com.py`, but the last verified Cloudflare Email Routing (15 October) only routes `soporte@`, with catch-all off. Either add a `hola@` route to the same verified destination, or change `NEXT_PUBLIC_SUPPORT_EMAIL` to `soporte@` and rebuild. Then send one test message.
2. **Database backup.** No production MySQL backup is on record. Confirm Hostinger's automatic backups cover the app database and keep one logical export outside the host.
3. **App email delivery.** Sign-up verification and password-reset mail still need one Inbox (not Spam) acceptance.
4. **Legal operator.** `/privacidad` and `/terminos` name Marklund Sales & Marketing AB, Sweden, and say they are pending legal review.
5. **Android acceptance with the new test button**, after this branch is deployed:
   1. Install from Chrome, open the installed icon and sign in.
   2. Ajustes → Avisos → *Activar avisos* → Allow.
   3. *Probar con la app cerrada*, then go to the home screen. Record whether *Mi Bebé: aviso de prueba* arrives.
   4. Tap it. Record whether Ajustes opens with *¡Funciona!*.
   5. *Desactivar avisos*. Record that the test buttons disappear and that no further notices arrive.

   Browser fixtures and DevTools push delivery do not establish this; only the phone does.

## Not changed

Google login, required accounts, health consent, stored data, sync, offline and service-worker caching, installation, notification preferences and categories, clinical measurements, images (107 accepted images remain as released in PR146), hosting, environment, DNS, database and cron.
