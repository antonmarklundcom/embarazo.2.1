# Known issues

Still-open, cross-unit items promoted from the "Known issues" sections of
`docs/log/u1.md`–`u9.md` and `docs/log/w1.md`–`w5.md` by U11 (the link
pass), plus V1–V3, W6, R0-1–R0-3 and the two integration logs promoted by
W7 (the final link pass, below "## From V/W6/R0"). Pointers to the source
log, not new findings — anything a later log already marked resolved (e.g.
W3's hero-contrast fix, addendum in `docs/log/w3.md`) is left out. One open
item from `docs/decisions-needed.md` (the W4 PIN-card extraction) is
tracked there, not duplicated here.

## Content & images

- `public/assets/semanas/` and `public/assets/comparaciones/` are still
  empty — every week-hero `<img>` 404s to its fallback; production today,
  not a regression. — `docs/log/u7.md`
- All 12 "Ejercicios" entries stay unpublished (the tile shows "Pronto")
  until the founder supplies the step images named in
  `public/assets/ejercicios/README.md`. — `docs/log/u5.md`
- The "Ejercicios" tile reuses the existing, thematically mismatched
  `"checklist"` icon rather than a dedicated one — a one-line follow-up for
  whoever next touches `components/ToolIcon.tsx`. — `docs/log/u5.md`
- Two of the eight Recomendados resources have no verified WhatsApp number
  (only landlines found for La Leche League Paraguay); every seeded entry
  uses `url` instead. — `docs/log/u3.md`
- Recomendados internal-path CTAs (`/derechos`, `/emergencia`) open in a new
  tab, same as every other CTA — a minor UX rough edge worth revisiting on a
  real phone before launch. — `docs/log/u3.md`
- The week-hero E2 share card keeps its flat, un-themed card design, per
  U7's own backlog note. — `docs/log/u7.md`

## AI usage & spend

- `/admin/ia`'s alert banner (and now the `/admin` banner U11 added) is
  scoped to the current UTC month only — the previous month's card never
  alerts, since it is already closed. — `docs/log/u2.md`
- No live e2e coverage of the Pausar/Reanudar button's actual effect, or of
  U9's "Sugerir borrador" button being absent when the feature is disabled
  or capped — CI has no database/OAuth to exercise an authenticated admin
  session; both are covered at the unit-test level instead. —
  `docs/log/u2.md`, `docs/log/u9.md`

## Guaraní

- The 5-1-1 and kicks-nudge Guaraní strings (D7) are hand-written jopara,
  pending the same native-speaker review every other `gn` string on
  `docs/GUARANI-REVIEW.md` is waiting on. — `docs/log/u4.md`

## Admin & support console

- Support-console restore (I1/U6) only brings a record back on a device
  that still holds the body locally — the server never kept a deleted
  record's contents to return. — `docs/log/u6.md`
- "Cerrar sesión en todos los dispositivos" is not a lockout: a stolen
  phone's owner can sign straight back in with her password (correct for
  that case, but worth knowing it isn't a hard block). — `docs/log/u6.md`
- None of U1/U2/U6/U9's admin actions (flag toggles, Pausar, the five
  support actions, "Sugerir borrador") have been exercised against a real
  signed-in admin session in CI — no database/OAuth there. All are covered
  by unit tests over the underlying functions instead of e2e. —
  `docs/log/u1.md`, `docs/log/u2.md`, `docs/log/u6.md`, `docs/log/u9.md`

## Infrastructure

- U1's feature-flag cache is per-process with a 60s TTL — on a multi-process
  host a toggle can take up to a minute to reach every worker; documented on
  screen and matched by the route's `max-age`. — `docs/log/u1.md`
- Marking the W1 `fast` CI job as a required check in branch protection is a
  founder step, not settable from inside the repo. — `docs/log/w1.md`
- Confirmed pre-existing, Windows-only test failures unrelated to any unit's
  own changes: `lib/flags/keys.test.ts`, `lib/articles/index.test.ts` and
  `lib/i18n/guaraniReview.test.ts` fail on this machine over backslash-path/
  CRLF assertions (reproduces on a clean `main` checkout too); `lib/server/
  auth.test.ts`'s rate-limit test has been seen to time out once under a full
  `npm test` run and pass on retry. — `docs/log/u8.md`, confirmed again by W7
  (`docs/log/w7.md`)
- Confirmed pre-existing e2e flake, not a regression: `offline.spec.ts`,
  `csp.spec.ts` (the service-worker-dependent cases), `sync.spec.ts`,
  `appointment-agenda.spec.ts` and (same root symptom — an offline navigation
  landing back on `/` instead of the precached route) `revoked-companion.spec.ts`
  intermittently fail on a full `npx playwright test` run and clear or shrink
  on rerun; it has hit GitHub CI twice and cleared on rerun both times.
  W7 saw 10/144 fail on a full run and 7/25 fail on an immediate rerun of just
  those files (with `sync.spec.ts` and part of `csp.spec.ts` clearing) — see
  `docs/log/w7.md`.

## From V1–V3, W6, R0 (round 2)

Promoted by W7; U11 predates these merges so its own pass never saw them.

- CSP `img-src` names Google's and Facebook's avatar CDNs by hostname — if a
  provider moves its CDN the avatar breaks and there is no fallback for a
  present-but-blocked image, only for an absent one. — `docs/log/v1.md`
- CSP `connect-src` carries no object-storage origin in a build where
  `PHOTO_STORAGE_ENDPOINT` is unset at **build** time (the header is baked in
  at build, not read at runtime) — a deployment that only sets it at runtime
  would have photo backup blocked by its own policy. — `docs/log/v1.md`
- `insertPregnancy`'s duplicate-key contract (V2's sharing backend) is
  expressed in prose and in the test-only memory backend, not in the
  `SharingBackend` type — a future sharing backend could swallow the
  duplicate and break the race-recovery path silently. — `docs/log/v2.md`
- V3's Dexie `SCHEMAS` fixture duplicates each version's `stores` string by
  hand (a test asserts the version lists agree, so a version can't be
  forgotten, only mistyped) and its photo fixtures store a string where a
  real row holds a `Blob` — nothing under unit test reads the bytes.
  — `docs/log/v3.md`
- W6's `npm run perf` does not pass in full on the dev machine it was built
  on: `/` (home) is bimodal (~2000 ms LCP on a quiet run vs. ~4600–4800 ms on
  one sharing CPU with other sessions) and `/semana/20` has a small,
  reproducible CLS of 0.004995 (under Lighthouse's "good" 0.1 threshold).
  Flagged, not chased — W6 owns the script, not app performance; see G3 in
  `docs/BUILD-PLAN.md`. — `docs/log/w6.md`
- R0-2's fix covers `/emergencia` and `/derechos` only. The README's "Qué
  funciona offline" section also lists several tools (síntomas, diario,
  carné, pataditas, contracciones, peso, checklist) whose *data* is local but
  whose *routes* are not in the service worker's cold-install precache
  list — a weaker, different claim than R0-2's, left as a maintainer call on
  whether the README wording or the precache list should change.
  — `docs/log/r0-2.md`
- The 8 residual `npm audit` findings (5 moderate, 3 high) all need a major
  dependency bump each and are blocked upstream: `next` 16 needs `next-auth`
  v5 stable (still `5.0.0-beta.32` on npm as of 2026-09-16 — no `latest`-tag
  v5 release exists yet, checked live), `@serwist/next` pins `browserslist`
  exactly and has no 9.x patch, and `drizzle-kit`'s only audit-fix offer is a
  downgrade. None are realistically exploitable in this app's build/runtime
  shape. — `docs/log/npm-audit-2026-09.md`, `docs/log/round-2-integration.md`
