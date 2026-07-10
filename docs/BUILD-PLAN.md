# Build plan — remaining engineering work

> **Authored by Claude Fable 5** (July 2026), for execution by Claude Opus
> or Claude Sonnet sessions. Read `docs/ARCHITECTURE.md` (especially §4
> privacy contract and §6 conventions) before starting any task. Work the
> phases in order; tasks within a phase are independent unless noted.
>
> This plan contains **code work only**. Founder-side data/content/legal
> tasks (real directory listings, medical reviewer, articles, Guaraní
> review, lawyer verification, branding, ops) live in
> `docs/REVIEW-AND-LAUNCH-PLAN.md` §4 and are NOT repeated here.
>
> Status legend: each task lists **Done when** criteria. A task is complete
> only when those hold AND `npx tsc --noEmit`, `npm test`, `npm run build`
> pass. Append a DECISIONS.md entry for anything non-obvious.

## Already done (do not redo)

- Investor MVP: modes, 42 weeks, tools, derechos, emergencia, carné, PWA.
- Phase 0 hardening (July 2026): backup/restore + `storage.persist()`,
  `/privacidad` `/terminos` drafts, error/404/offline pages, pinch-zoom fix,
  placeholder video gallery gated, onboarding due-date entry + save error
  handling, sitemap/robots, `/api/v1/go` rate limiting.

---

## R1 — Product rename (BLOCKED: founder must supply the new name)

The current working name is being dropped. Once the founder provides the
new name (and domain), execute the rename in one PR:

**User-visible (safe to change freely):**
- `app/layout.tsx` metadata (title template, OG, appleWebApp.title)
- `app/manifest.webmanifest` (`name`, `short_name`, `description`)
- All copy that speaks the name: `components/Onboarding.tsx`,
  `components/PrivacyLine.tsx`, week tips in `lib/weeks.ts` (grep — at
  least week 20 mentions the directory by name), `lib/whatsapp.ts`
  prefill ("Vi su información en …"), `/privacidad`, `/terminos`,
  seed articles in `lib/seed/articles.ts` that reference the app,
  `README.md`, `package.json` `name`/`description`.
- Icons: rerun `scripts/gen-icons.mjs` if it renders a letterform; replace
  with real branding when available.

**Internal identifiers (data-loss risk — handle deliberately):**
- `new Dexie("nido")` in `lib/db.ts`: **keep the internal DB name as-is**
  (users' IndexedDB data is keyed to it) OR write a one-time migration that
  opens the old DB, copies all tables to the new name, verifies counts,
  then deletes the old DB. Keeping it is the recommended, zero-risk option;
  document the choice in DECISIONS.md.
- `localStorage` keys `nido.pin.salt` / `nido.pin.verifier` in
  `lib/crypto.ts`: same rule — keep or migrate, never just rename.
- Backup format `app: "nido"` in `lib/backup.ts`: keep accepting the old
  value on import forever; write the new value on export.
- SW cache name `nido-api` in `app/sw.ts`: safe to rename (caches rebuild).

**Done when:** grep for the old name returns only the deliberately-kept
internal identifiers listed above, each with a code comment explaining why.

---

## Phase 1 — remaining pre-launch code (independent of founder content)

> **Status (July 2026):** P1.1–P1.5 DONE (see DECISIONS.md "Phase 1"). OG
> *image* within P1.4 deferred to branding/R1. P1.6 (landing page) and P1.7
> (Playwright e2e) still open.

### P1.1 Install experience
The distribution model is "installs from a link", but there is no install
UX. Add:
- A `useInstallPrompt()` hook capturing `beforeinstallprompt`; an
  "Instalar la app" card on Home + Ajustes shown only when the prompt is
  available and the app isn't already standalone
  (`matchMedia('(display-mode: standalone)')`).
- iOS path: detect iOS Safari (no `beforeinstallprompt`) and show a short
  "Agregar a la pantalla de inicio" instruction sheet (share icon → añadir).
- **Done when:** Chrome/Android shows the native prompt from the button;
  iOS shows instructions; installed users never see either.

### P1.2 PWA update flow
Serwist uses `skipWaiting: true`; a stale client can straddle versions.
Add a small "Hay una versión nueva — recargar" toast when a new SW takes
control (`controllerchange`). **Done when:** deploying a new build surfaces
the toast on an open old client and reload gets the new version.

### P1.3 Privacy-compatible aggregate analytics
No user-level tracking — but the founder needs installs/retention counts.
Implement a first-party, cookie-less ping: `POST /api/v1/ping` accepting
ONLY `{ event: "open" | "install", mode, trimester?, department? }` (zod
whitelist + tests like the existing routes), fire-and-forget to
`SHEETS_WEBHOOK_URL`-style env (`ANALYTICS_WEBHOOK_URL`), rate-limited,
sent at most once per day per device (localStorage last-ping date; the
date, not an ID — no device identifier is ever generated). Update
`/privacidad` to disclose it. Off entirely when the env var is unset.
**Done when:** tests prove non-whitelisted fields are rejected; no cookie,
no UID anywhere; unset env = no network call.

### P1.4 Per-page social/OG polish
- OG images: static branded default in `public/og.png` (placeholder art
  now, real branding later) + wire `openGraph.images`; per-guía dynamic OG
  via `next/og` `ImageResponse` (title on brand background) if it doesn't
  push bundle/infra cost.
- Add `metadata.description` per `/semana/[n]` (from milestone text) via
  `generateMetadata`.
- Manifest: add `screenshots` (2–3 PNGs, can be generated from the running
  app) and `shortcuts` (Emergencia, Herramientas).
- **Done when:** sharing `/` and a guía into WhatsApp shows title, description
  and image; Android install sheet shows screenshots.

### P1.5 ESLint baseline
`npm run lint` currently hits the interactive setup prompt (no config).
Add a flat-config with `next/core-web-vitals` + TS, fix or explicitly
disable any findings, add `npm run lint` to CI. **Done when:** CI runs
lint non-interactively and passes.

### P1.6 Landing page for non-users
`/` is the app (first-run gate). Add a lightweight public `/conoce` page:
what the app is, privacy promise, install CTA (links into P1.1 flow),
screenshots, guía links for SEO; add it to the sitemap and link it from
the 404 page footer. No framework additions. **Done when:** page is static,
<15 kB route JS, and passes Lighthouse a11y ≥95.

### P1.7 E2E smoke tests
Add Playwright with 3–4 flows against `next start`: complete onboarding
(both modes and both date entries), log a symptom, export a backup and
restore it, offline navigation to a precached week page. Wire into CI
(build once, reuse). **Done when:** `npm run test:e2e` is green locally
and in CI.

## Phase 2 — retention & reach (post-soft-launch)

### P2.1 Local appointment reminders (opt-in)
In-app banner exists; add real notifications WITHOUT a push server (the
privacy contract forbids storing tokens server-side): request Notification
permission from Ajustes only (never on load); schedule via SW using the
Notification Triggers API where available, else check-on-open fallback
(compute overdue reminders when the app opens/SW activates). Copy must be
honest about reliability limits, esp. iOS. **Done when:** permission asked
only from the settings toggle; reminder fires day-before on
Android/Chrome; graceful fallback elsewhere; no server involvement.

### P2.2 "Compartir mi semana" share card
Web Share API (`navigator.share`) from the week hero: shares a branded
text + link (and a canvas-rendered image card where `share` supports
files). Never includes health details beyond the week number, and the
share is user-initiated only. **Done when:** share sheet opens on Android/iOS
with correct fallback (copy-link) on desktop.

### P2.3 Content ops pipeline (founder-editable data without code review)
Replace "founder edits TS files" with validated JSON: move articles/events
metadata to JSON with a zod schema + `npm run validate:content` script
(also run in CI) that checks slugs, dates, +595 numbers, department slugs,
no placeholder IDs. Keep the `PUBLISHED_*` gating pattern. Optionally then
implement the `lib/wordpress.ts` mapping (WP as CMS) — only if the founder
confirms a WP instance; otherwise skip. **Done when:** an invalid entry
fails CI with a readable message; valid edits need no TS knowledge.

### P2.4 Tool depth (small, high-value)
- Contractions: 5-1-1 / 4-1-1 pattern hint ("estas contracciones vienen
  cada ~5 min hace 1 h — contactá a tu sanatorio") with non-diagnostic copy.
- Kicks: session history sparkline + "menos que tu ritmo habitual" nudge
  linking to the alarm-signs guía.
- Weight: plot recommended-gain band **only after** the medical reviewer
  signs the ranges (blocked on founder task; build behind a flag).
- **Done when:** each has unit tests for the pattern logic and reviewed copy.

### P2.5 Guaraní expansion scaffolding
Generalize the `textGu` pattern from `lib/emergency.ts` into a tiny helper
(`<Bilingual>` component: Spanish + `lang="gn"` line) and apply to daily
tips + alarm-adjacent strings, keeping current jopara register. Actual
translations remain drafts until native review (founder task). **Done when:**
adding a Guaraní string anywhere is a one-liner and renders consistently.

## Phase 3 — the moat

### P3.1 Postpartum mode ("Ya nació") — largest remaining feature
Third `AppMode`; Dexie **v5** (append-only): `baby` (birth date, name
optional), `babyVaccines` (PAI checklist state), `postpartumChecks`.
Home switches to baby-age dashboard (day/week/month), PAI vaccine calendar
computed from birth date (catalog in `lib/pai.ts`, unit-tested like
`derechos.ts`; schedule content itself needs medical review before launch),
puerperio alarm signs (with Guaraní), lactancia content hooks, Registro
Civil checklist reuse. Pregnancy data is preserved — mode switch, never a
wipe; backup format extends compatibly (bump `BACKUP_VERSION`, keep
importing v1). **Done when:** a user can flip to "Ya nació" at birth and
the app remains fully offline/device-only; v1 backups still restore.

### P3.2 Partner mode (device-local)
"Compartir con tu pareja" currently sits in the roadmap teaser. Honest v1
without a server: an export-code flow — generate a small shareable summary
(week, due date, next appointment) as text/QR the partner's device imports
into a read-only companion view. No sync, no accounts; say so in the UI.
**Done when:** roadmap card becomes a working feature with the same privacy
contract.

### P3.3 Directory at scale
When listings grow past ~100: move directory to server-side filtered
responses with pagination (same whitelist contract), add a city-level
filter UI, and a "reportar un dato incorrecto" WhatsApp deep link per
listing. **Done when:** 18-department data loads fast on 3G and stale
listings have a feedback path.

---

## Standing rules for every task

1. Classify against the privacy contract (ARCHITECTURE.md §4) first.
2. Gates: `npx tsc --noEmit` && `npm test` && `npm run build`.
3. New pure logic ⇒ unit tests. New API surface ⇒ whitelist + tests.
4. Placeholder data never ships visibly (gate it, `PUBLISHED_*` pattern).
5. Append rationale to `DECISIONS.md`; keep this file's task statuses
   updated (check items off with the PR link).
6. es-PY voseo copy; safety-critical strings get Guaraní drafts.
