# Architecture

> **Authored by Claude Fable 5** (planning/architecture pass, July 2026).
> Execution of the build plan in `docs/BUILD-PLAN.md` is intended for
> Claude Opus or Claude Sonnet sessions. Read this file + `DECISIONS.md`
> before writing any code.
>
> **Naming:** the product's launch name is **TBD** (founder decision — the
> previous working name is being dropped). These docs say "the app". The
> codebase still carries the old name internally until task **R1** in the
> build plan executes the rename. Do not introduce the old name in any NEW
> user-facing copy, docs, or commit messages.

## 1. What this is

A privacy-by-design pregnancy PWA for Paraguay. Free, installable from a
link, works offline and on low data. Not a translated global app: content,
logistics (carné perinatal, IPS vs. private, Registro Civil, PAI vaccines,
labor law) and the directory are built around how pregnancy works in
Paraguay, in es-PY voseo, with Guaraní (jopara) on safety-critical strings.

Two user modes, switchable without data loss:
- **Embarazada** — week-by-week tracking, tools, prenatal-visit summary.
- **Planeando / buscando** — cycle calendar, estimated fertile days
  (explicitly *not* contraception), preconception checklist.

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, TS strict | SSR build (`next build && next start`), no static export |
| Styling | Tailwind 3.4 | theme tokens: `cream, petrol, terracotta, rose, sage, ink, muted, whatsapp, sand`; radii `rounded-card`/`rounded-tile` |
| Font | Nunito Sans via `next/font` (400/500) | |
| On-device data | Dexie 4 (IndexedDB) | THE privacy boundary — see §4 |
| Server data | In-repo seeds (`lib/seed/*`) | optional WordPress hook in `lib/wordpress.ts`, not built |
| PWA | Serwist 9 (`app/sw.ts` → `public/sw.js`, git-ignored) | disabled in dev; test offline via `npm run build && npm start` |
| Validation | zod (API param whitelists) | |
| Tests | Vitest (`npm test`) | pure logic + API boundary tests |
| CI | `.github/workflows/ci.yml` | `npm ci && npm test && npm run build` on every push/PR |

## 3. Directory map

```
app/
  layout.tsx            root layout: metadata, viewport, font, Providers
  (app)/                app shell group: AppHeader + BottomNav wrap all routes
    page.tsx            home (first-run gate renders <Onboarding> in place)
    semana/[n]/         42 SSG week pages (precached offline)
    guias/, guias/[slug]/, guias/videos/
    herramientas/*      on-device tools (journal, photos, kicks, contractions,
                        weight, checklists, carné, resumen)
    planeando/*         cycle mode (calendario, fertilidad, checklist)
    derechos/  emergencia/  directorio/  eventos/  ajustes/
    privacidad/  terminos/  error.tsx  not-found.tsx
  offline/              SW navigation fallback (standalone, no shell)
  global-error.tsx  not-found.tsx  sitemap.ts  robots.ts  sw.ts
  api/v1/               placements | directory | go/[id] | health
components/             shared client components (Onboarding, BottomNav, …)
lib/
  db.ts                 Dexie schema v1–v4 (see §4); db() throws server-side
  pregnancy.ts cycle.ts weeks.ts dailyTips.ts   pure logic (unit-tested)
  derechos.ts emergency.ts checklists.ts preconception.ts   typed catalogs
  crypto.ts             PIN → PBKDF2 → AES-GCM note encryption
  backup.ts             full export/import of every table (JSON + data-URL blobs)
  rateLimit.ts          in-memory sliding window for /api/v1/go
  whatsapp.ts wordpress.ts departments.ts images.ts
  seed/                 articles.ts videos.ts events.ts directory.json placements.json
docs/                   this file, BUILD-PLAN.md, REVIEW-AND-LAUNCH-PLAN.md
scripts/gen-icons.mjs   dependency-free PWA icon generator
```

## 4. The privacy contract (do not break)

This is the product's core promise and is enforced by construction:

1. **All health data is device-only** (IndexedDB via `lib/db.ts`): profile,
   pregnancy dates, journal, photos, carné photos, clinical basics, kicks,
   contractions, weight, cycles, checklists. `db()` throws if imported
   server-side.
2. **The only values ever sent to the server** are derived `trimester` and
   stored `department` (for placements/directory). API routes enforce this
   with zod `.strict()` + explicit allowed-key whitelists that return 400
   on anything else — covered by tests in `app/api/v1/api.test.ts`.
3. **No accounts, no email/phone, no tracking cookies, no Set-Cookie.**
4. Optional PIN encrypts journal notes (AES-GCM, PBKDF2 150k iters); only a
   salt + encrypted verifier persist, never the PIN.
5. `/api/v1/go/[id]` 302s to `wa.me`; attribution (if `SHEETS_WEBHOOK_URL`
   set) is fire-and-forget with id/trimester/department only.

**Any new feature must be classified against this contract before coding.**
If it needs a server to see personal data, it does not ship in this form —
redesign it (see BUILD-PLAN notes on analytics and notifications).

### Dexie schema versions (append-only)
v1 core stores → v2 `photoEntries` → v3 `cycles`, `cycleSettings` →
v4 `carnePhotos`, `clinical`. **Never renumber or edit past versions**; new
stores/indexes get a new `this.version(n)` block. Non-indexed fields can be
added to existing interfaces with no version bump. The database *name*
(`new Dexie("nido")` in `lib/db.ts`) must survive the product rename or be
migrated — see task R1; renaming it naively orphans every user's data.

## 5. Data flow

```
User device                              Server (stateless, seed-backed)
┌────────────────────────────┐           ┌─────────────────────────────┐
│ IndexedDB (Dexie v4)       │           │ /api/v1/placements          │
│  health data, photos, PIN  │──trimester┤ /api/v1/directory           │
│                            │  +dept───▶│   (zod whitelists, 1h cache)│
│ Service worker (Serwist)   │           │ /api/v1/go/[id] → wa.me 302 │
│  precache: shell, 42 weeks,│           │   (+optional webhook ping,  │
│  guías; NetworkFirst APIs; │           │    rate-limited)            │
│  /offline nav fallback     │           │ seeds: lib/seed/* (or WP    │
└────────────────────────────┘           │  if WP_API_URL, not built)  │
                                         └─────────────────────────────┘
```

## 6. Conventions for continuing agents (Opus/Sonnet: read this)

- **Verification gates:** `npx tsc --noEmit`, `npm test`, `npm run build`
  must all pass before every commit. CI runs test+build on every push.
- **`DECISIONS.md` is append-only** — log every non-obvious choice there
  with a short rationale, as previous sessions did.
- **Copy is es-PY voseo** (tomá, registrá, acercate), warm, non-alarmist.
  Medical claims always carry the "no reemplaza la consulta" framing.
  Safety-critical strings get Guaraní `textGu` companions (draft register:
  simple jopara, Spanish clinical nouns kept).
- **Touch targets ≥44px**, mobile-first, max-w-md column, theme tokens only
  (no ad-hoc hex).
- **Seeds marked PLACEHOLDER are placeholders** — never present invented
  businesses/videos/events as real; gate them (see `PUBLISHED_VIDEOS`
  pattern in `lib/seed/videos.ts`) rather than shipping them.
- **No new runtime dependencies** without recording the trade-off in
  DECISIONS.md. The bundle is deliberately small (First Load ~107 kB shared).
- Tests: pure logic in `lib/*.test.ts`; API boundary behavior in
  `app/api/v1/api.test.ts`. New pure logic ⇒ new unit tests.
- Branch/PR flow: work on `claude/*` branches, push, PR to `main`.
