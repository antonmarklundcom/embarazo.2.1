# Improvement report — 2026-09-11 (Fable review)

Read with `docs/BUILD-QUEUE-2026-09-11.md`, which turns the decisions below
into PR-sized units with a model each. This file is the *why*; that one is
the *what*. Nothing here reopens a founder decision from
`docs/HANDOFF-2026-09-06.md` §2 or `docs/BUILD-QUEUE-2026-09-06.md` §2.

## 1. Where the repo stands

Measured in this session on `main` at `0019db6`:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm test` | 1083 tests, 98 files, all green, ~13 s |
| Runtime deps / dev deps | 13 / 16 |
| `any` escapes, `console.log` in source, TODOs | 0 / 0 / 1 (a comment) |
| API routes with zod whitelist + rate limit + in-handler auth | all 14 checked |

September queue: U1, U2, U4, U5, U6, U7 merged (PRs #86–#93). Still to
build: U3 (Recomendados), U8 (brand constant), U9 (AI drafts in the Q&A
queue), U11 (link pass). U10 (hero asset drop) waits on the founder's
renders; `public/assets/semanas/` is still empty, so the home hero shows
its fallback and LCP stays at ~3.4 s.

The code is in better shape than the size of `docs/` suggests. The
improvements worth paying for are not features; they are the four places
where the app's own guarantees are asserted by prose or by slow tests
instead of by fast ones, plus the one security header that has been
"report-only, promote later" since PR-2.

## 2. Findings, ranked

### 2.1 Security: the CSP is theatre until it is enforced

`next.config.ts` ships `Content-Security-Policy-Report-Only` with a comment
saying it is on the list to promote. Nothing reads the reports (there is no
`report-to` endpoint), so the header has never produced information and
never blocked anything. Meanwhile the enforced header carries only
`frame-ancestors 'none'`.

**Decision: enforce it now, with `script-src 'self' 'unsafe-inline'` kept
as the documented residual.** Next's inline bootstrap needs either a nonce
or `'unsafe-inline'`; a nonce needs `middleware.ts` to set a per-request
header, and "no middleware" is a tested invariant of this repo
(`lib/invariants/middleware.test.ts`) that a CSP nonce is not a good enough
reason to break. Everything else — `default-src`, `connect-src`,
`img-src`, `object-src 'none'`, `base-uri`, `form-action`,
`frame-ancestors` — is enforceable today and worth enforcing. The
verification is the point: every route in the sitemap plus the app shell,
loaded under Playwright with `securitypolicyviolation` captured, zero
violations. Unit **V1**.

### 2.2 Tests: the most sensitive server modules have no behavioural unit tests

`lib/server/sharing.ts` (668 lines: invites, memberships, revocation,
sharing levels, snapshots) is covered by `lib/sharing/routeContract.test.ts`,
which reads the source as text and asserts on substrings, and by four
Playwright specs. The same is true of `support.ts`, `questions.ts`,
`push.ts` and `photos.ts`. A change to who can read whose snapshot passes
`npm test` today.

The repo already has the right pattern: `lib/server/sync.test.ts` swaps the
storage under the real `pushRecords`/`pullRecords` for a `Map` via a
`SyncBackend` interface and runs the real rules in memory. **Decision: apply
the A3 backend-interface pattern to `sharing.ts` first (Opus, because the
cut between rules and storage is the design decision), then fan the same
shape out to `questions.ts`, `support.ts`, `push.ts` and `photos.ts`
(Sonnet, one PR).** The text-assertion tests stay; they catch a different
class of regression. Units **V2** and **W5**.

### 2.3 Tests: `lib/db.ts` has zero unit coverage

The Dexie layer (587 lines, 20+ importers, the offline source of truth,
append-only schema versions) is tested only through e2e. Schema upgrade
paths are exactly what e2e does not exercise: a fresh browser never opens a
version-9 database. `fake-indexeddb` runs Dexie in Node. **Decision: a
second vitest project (`test:db`) with `fake-indexeddb/auto`, pinning every
upgrade from the oldest still-installed version, plus `softDelete`,
`notDeleted`, `wipeAllData` and the `syncState` epoch row.** Unit **V3**.

### 2.4 CI: a PR can merge with no automated signal

CI is label-gated on purpose (K21: builders validate in-session, one run per
PR). The cost side is right; the failure mode is a PR merged without the
label. **Decision: add an always-on fast lane on every PR push — `tsc`,
`lint`, `npm test` — no browser, no build, about two minutes. The full job
stays label-gated.** Unit **W1**.

### 2.5 Maintainability: two files carry too much

`app/(app)/ajustes/AjustesClient.tsx` is 1182 lines; `app/(app)/page.tsx` is
705 and is also the merge hotspot of every unit that has run. Both are
mechanical to split; both have e2e pins. **Decision: split after U11 (the
last unit that must edit them), behaviour-preserving, e2e green before and
after, no new state.** Unit **W4**.

### 2.6 Docs: the journal has outgrown the entrance

`DECISIONS.md` is 265 kB with 184 headings, and `docs/` has sixteen
planning documents, several of which supersede each other by banner notes.
A spot-check found no README drift, but a new session's first ten minutes
are spent working out which file is current. **Decision: `docs/INDEX.md`
as the single entrance (what is current, what is history, in one table),
move superseded plans under `docs/archive/` with their banners intact, fix
the known `scripts/*.mts` typecheck gap while in the area.** Unit **W2**.

### 2.7 Accessibility and the hero themes

Two user-photo `<img>`s carry `alt=""`, which hides the user's own photos
from a screen reader. U7's six hero themes were contrast-checked by eye.
**Decision: real alt text, and a measured contrast test (WCAG AA for ink
over each theme's scrim) pinned in `lib/hero/themes.test.ts`.** Unit **W3**.

### 2.8 Performance: keep the number from drifting

LCP is 3.4 s because the hero fallback renders where a render should; the
fix is the founder's assets (U10), not code. What code can do is stop the
next regression from arriving unnoticed. **Decision: a `npm run perf`
script that runs Lighthouse against `next start` on `/`, `/semana/20`,
`/herramientas` and asserts a budget (perf ≥ 90, LCP ≤ 3.5 s, CLS = 0),
run in-session as a gate, not in CI.** Unit **W6**.

### 2.9 Not changing, on purpose

- **In-memory rate limiter.** Correct for one Node process on Hostinger; a
  shared store is a multi-instance problem this deployment does not have.
- **Next 16 / eslint 10.** Still blocked: `next-auth@latest` is 4.24.15 and
  `beta` is still `5.0.0-beta.32` (checked 2026-09-11). Re-check each
  window; the combined bump becomes an Opus unit the day v5 is stable.
- **Ask Flo, postpartum mode, Play packaging, paid tier.** Founder-parked.
- **Content seeds.** Directory, events, placements, prices, exercise images
  are gated placeholders waiting on real data; the gate is working. Founder
  work (`docs/LAUNCH-CHECKLIST.md` §2, §4).

## 3. The founder's half

Nothing below is a PR. Each blocks something a unit built:

1. **The 40 hero renders + fruit images** (U10, LCP). The single highest
   product-value item outstanding.
2. **Exercise step images** into `public/assets/ejercicios/` (U5 lights up).
3. **Name decision** (U8 defaults to "Mi Bebé · Embarazo Paraguay").
4. **15–30 real directory listings**; the app already hides the rest.
5. **A monitored support address** (`NEXT_PUBLIC_SUPPORT_EMAIL`), the
   smallest thing between the repo and a deploy.
6. **Who drains the Q&A queue** — U9 makes it faster, not unnecessary.

## 4. Model split and order

Opus for the three units that create a contract or carry blast radius
(enforced CSP across every route; the rules/storage cut in the sharing
module; the Dexie test project). Sonnet for everything that fills an
existing shape. All Opus units run first, in one window, then the Sonnet
window finishes the September queue and runs the W units. Fable appears
nowhere in the queue (`fable-cost-guardrail`).

Estimated cost at recent rates: Opus 3 × $15–25, Sonnet 11 × $5–10 →
**≈ $100–180** for both windows; wall-clock ≈ 3 h Opus, ≈ 6 h Sonnet.
