# Ideas backlog — not confirmed, not in the build queue

Written 2026-09-06 at the end of the Fable planning review. Nothing here is
approved. It exists so a later Sonnet session can raise these with the founder
at the right moment (`prompts/IDEAS-REVIEW.md`) and, once one is approved,
start from the implementation notes instead of rediscovering the codebase.

Status legend: **unconfirmed** (founder has not said yes), **founder task**
(no code), **later** (approved in spirit, wrong time).

---

## 1. Product ideas

### 1.1 Postpartum mode "Ya nació" as the next queue — unconfirmed (C6)
**Why now:** the founder's partner is due ~November 2026 and is the face of
the app; the app must know what to do on birth day.
**Implementation insight:** BUILD-PLAN H1 + `DECISIONS.md` D7 already settle
the architecture: a third `AppMode`, data carried over at birth (mode switch,
never a wipe), `babies` already an array on `Profile` (B2), PAI vaccine
calendar as a pure module (`lib/pai.ts`, unit-tested from birth date),
puerperio alarm signs with Guaraní `gn` fields like `lib/emergency.ts`.
New Dexie stores (`baby`, `babyVaccines`, `postpartumChecks`) must be added to
`lib/sync/stores.ts` **and** get a `TABLE_DISPOSITION`-style treatment on the
client; any new server table needs a `TABLE_DISPOSITION` line or the A5 test
fails. Needs one Fable planning session (October) → Opus foundation (mode +
stores + PAI) → Sonnet content (checklists, lactancia, Registro Civil reuse).

### 1.2 Themed hero on the E2 share card — later
**Insight:** `ShareCardContent` is a three-field whitelist by design (week,
wordmark, tagline); a theme id and the week render are not personal data, so
adding them is allowed, but it is a change to that type and the
`SHARE_FORBIDDEN_FIELDS` scan must keep passing. The card is drawn on a canvas
on device (`lib/share/draw.ts`); the render must be fetched from the same
origin and alpha-composited over the theme's gradient. Sonnet S after U7.

### 1.3 Own physical products ("canastilla" kit) — later, founder decision
**Insight:** the Recomendados `kind: "producto"` card with `priceGs` and a
WhatsApp order CTA (U3) is the entire v1 storefront: no cart, no checkout, no
Play Billing exposure (physical goods). Orders arrive on WhatsApp and are
invoiced outside the app (RUC/IVA — `paraguay-business-apps` skill). Clicks are
already counted through `/api/v1/go/[id]`. The only code when products exist is
data in `lib/seed/recomendados.json` plus images.

### 1.4 Directory "destacado" tier — unconfirmed (H5)
**Insight:** `DirectoryListingSchema` already has `isSponsored` and `priority`;
`/admin/patrocinios` already reports clicks per listing. A paid tier is a
contract and a data edit, not a feature. First real sponsor targets are the
sanatorio/ecografía businesses being called for directory consent.

### 1.5 "Empresas" audience (Ley 7383/2024, paid hours for prenatal controls) — unconfirmed
**Insight:** an employer-facing page belongs on embarazo.com.py (the marketing
site, `docs/SITE-PLAN-EMBARAZO-COM-PY.md`), not in the app. In-app, the rights
already live in `lib/derechos.ts` with Guaraní; a printable "constancia de
control prenatal" for the employer could be a Sonnet S tool later.

### 1.6 Ask Flo (user-facing AI assistant) — parked, do not raise before U9 has a corpus
**Insight:** if it is ever built, ship it free under the same
quota/ceiling/kill-switch pattern as `lib/server/aiBaby.ts` (fail closed, no
`console.` in the module, key as a header), with a mandatory escalation path to
`/emergencia` and the control prenatal. The human-approved answers produced by
U9 through `/admin/preguntas` are the evaluation set; do not build before a few
hundred exist.

### 1.7 Impressions / CTR for sponsors — parked, deliberately
**Insight:** `/admin/patrocinios` explains why there is no honest impression
count (placements are cached for an hour and precached by the service worker).
The only accurate version is a view beacon, which is a new tracking surface on
a pregnancy app. Raise only if a sponsor makes it a condition of paying.

## 2. Growth and distribution (founder tasks, no code)

- **Partner as user #1 (week 28 → 40):** her real weeks are the test plan for
  the hero, kicks, contractions, checklist and carné. Her gineco-obstetra is the
  most likely medical reviewer and the first consultorio for a QR poster.
- **Weekly "semana N" WhatsApp status** using the E2 share card; her groups are
  cohort one. Facebook groups of mamás paraguayas second. Play is credibility,
  not distribution (`LAUNCH-CHECKLIST.md` §8).
- **Sponsor one-pager** from `/admin/patrocinios` numbers, before launch.
- **Free slow clocks to start now:** D-U-N-S request (only matters for a Play
  organisation account, but it is free and takes weeks), DINAPI trademark check
  on the chosen name, Guaraní sheet (`docs/GUARANI-REVIEW.md`) to a native
  speaker with the jopara instructions in `LAUNCH-CHECKLIST.md` §3.2.
- **Friends-and-family deploy right after the Opus window** — `nextjs-deploy-
  hostinger` skill; needs C1 (app URL) and C2 (support address) answered.
- **Measure on a real mid-range Android on mobile data** before launch.

## 3. Technical debts worth a Sonnet hour when convenient

- `scripts/*.mts` are outside `tsc` (`tsconfig.json` `include` misses `.mts`);
  extending it surfaces two real type errors in `scripts/gen-guarani-review.mts`
  (`.gn` read off a union where two cheers legitimately lack it).
- `next-auth` v5 stable bump when released → unblocks Next 16 and eslint 10 as
  one combined task. TypeScript 7 waits on `@typescript-eslint`, a separate clock.
- e2e flake shape: `net::ERR_ABORTED` around offline transitions on
  `NetworkOnly` routes — check for a Dexie write or SW route race before
  assuming the code is wrong.

## 4. Key implementation insights from the review (read before touching these areas)

Compact, so a later session does not re-derive them.

- **Flags did not exist before U1.** Everything called a "flag" was an env var
  (`AI_BABY_ENABLED`) or a data gate (`publishedOnly()`; the video tile is
  locked because `PUBLISHED_VIDEOS` is empty). U1's store is one-directional
  for money: it can pause the AI feature, never enable one the env left off.
- **Two units adding Drizzle migrations in parallel collide** in
  `drizzle/meta/_journal.json`. Sequence them; generate with `npm run
  db:generate` after pulling main, never hand-write.
- **Every new server table needs a `TABLE_DISPOSITION` line** in
  `lib/server/account.ts` or `account.test.ts` fails; every new admin mutation
  needs an `ADMIN_ACTIONS` entry with a pinned meta shape in `lib/admin/audit.ts`;
  nothing under `app/admin` or `lib/server/admin.ts` may mention
  `syncRecords.payload` (source scan).
- **New API routes accept no unknown params and reject them** (J3 pattern,
  empty or explicit zod whitelist, tested in `app/api/v1/api.test.ts`).
- **`/api/v1/go/[id]` 404s for ids it cannot resolve** against placements and
  directory — any new clickable collection must be added to that lookup.
- **Sync contract:** deletes via `softDelete`, reads via `notDeleted`; pull
  ordering is by server-authored `serverUpdatedAt`; a server-side restore must
  bump both `updatedAt` and `serverUpdatedAt` or the client's LWW keeps the
  tombstone. Sessions are JWTs — per-device revocation needs a version column.
- **Preferences live on the Dexie `profile` row** (non-indexed field, no version
  bump, synced for free) — `lib/i18n/useLocale.ts` is the template.
- **The hero is the LCP element** on `/`, and `/semana/[n]` is statically
  generated for all 42 weeks; themes must be CSS/SVG (no downloads) and renders
  need alpha-preserving WebP (check `scripts/optimize-images.mjs`).
- **Guaraní strings** are `gn` fields beside the Spanish in source modules
  (`lib/emergency.ts`, `lib/derechos.ts`, `lib/i18n/dict.ts`), collected by
  `scripts/gen-guarani-review.mts`; a test fails if the sheet drifts.
- **CI is label-gated** (`run-ci`; remove and re-add after every push) and
  auto-merge is off. Validate in the session first.
- **The medical line from PR-19:** a general disclaimer covers general wellness
  content; specific clinical directives (obstetra notes, food-safety verdicts,
  weight-gain bands) stay hidden until a real reviewer's name is on them.
- **Brand string:** `mibebe` DB name, `mibebe.*` localStorage keys and SW cache
  names are identifiers, not brand — never rename them (it resets users' local
  state). Only user-visible strings go through `lib/brand.ts` (U8).
