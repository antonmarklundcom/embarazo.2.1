# Known issues

Still-open, cross-unit items promoted from the "Known issues" sections of
`docs/log/u1.md`–`u9.md` and `docs/log/w1.md`–`w5.md` by U11 (the link
pass). Pointers to the source log, not new findings — anything a later log
already marked resolved (e.g. W3's hero-contrast fix, addendum in
`docs/log/w3.md`) is left out. One open item from `docs/decisions-needed.md`
(the W4 PIN-card extraction) is tracked there, not duplicated here.

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
  own changes: `lib/flags/keys.test.ts` and `lib/articles/index.test.ts` fail
  on this machine over backslash-path/CRLF assertions (reproduces on a clean
  `main` checkout too); `lib/server/auth.test.ts`'s rate-limit test has been
  seen to time out once under a full `npm test` run and pass on retry. —
  `docs/log/u8.md`
