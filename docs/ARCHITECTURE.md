# Architecture

> **v3 — July 2026.** This document was rewritten after the founder decided
> to (a) add real accounts (Google / Facebook sign-in), (b) build a synced
> backend, and (c) adopt the feature set benchmarked against Preggers
> (see `docs/FEATURE-MAP.md`). **§4 — the data contract — changed
> materially.** The previous "no server, no accounts, ever" contract is
> superseded; read §4 in full before writing any code, even if you knew the
> old one.
>
> Read this file + `DECISIONS.md` + `docs/BUILD-PLAN.md` before coding.

## 1. What this is

**Mi Bebé** — a pregnancy app for Paraguay. Free, installable from a link,
works offline and on low data.

The purpose, in the founder's words: **make mothers and their families
happy, safe and engaged through the pregnancy.** Three things follow from
that, and they order every trade-off in this codebase:

1. **Safe** — medically reviewed content, honest alarm signs, never a
   diagnosis. Safety copy carries Guaraní (jopara).
2. **Happy** — the emotional surface (baby nickname, week hero, size
   comparisons, bump photos, sharing) is not decoration; it is the product.
3. **Engaged** — the family is part of the app, not an afterthought: the
   partner and close family get their own role and their own view.

It is not a translated global app. Content, logistics (carné perinatal,
IPS vs. privado, Registro Civil, PAI vaccines, labour law) and the
directory are built around how pregnancy actually works in Paraguay, in
es-PY voseo.

User modes, switchable without data loss:
- **Embarazada** — week-by-week tracking, tools, prenatal-visit summary.
- **Planeando / buscando** — cycle calendar, estimated fertile days
  (explicitly *not* contraception), preconception checklist.
- **Ya nació** (planned, Phase H) — postpartum / baby mode.

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, TS strict | SSR build (`next build && next start`), no static export |
| Styling | Tailwind 3.4, **pastel/cream "Mi Bebé" language** | tokens in `tailwind.config.ts`; see §7 |
| Font | Nunito Sans via `next/font` (400–900) | |
| On-device data | Dexie 4 (IndexedDB) | still the **offline source of truth** — see §4/§5 |
| Server data | **MySQL + Drizzle ORM** (Hostinger) | new in v3; see §5 |
| Admin | `/admin`, role-gated, metadata-only | new in v3; see §9 |
| Auth | **Auth.js (NextAuth v5)**, Google + Facebook | new in v3; see §6 |
| Sync | custom pull/push over `/api/v1/sync` | last-write-wins per record; see §5 |
| Push | Web Push (VAPID) via the existing service worker | unlocked by having a server |
| AI images | Google Gemini image API (server-side only) | opt-in feature, see §10 |
| PWA | Serwist 9 (`app/sw.ts` → `public/sw.js`, git-ignored) | disabled in dev; test via `npm run build && npm start` |
| Validation | zod on every API boundary | |
| Tests | Vitest (`npm test`) + Playwright (`npm run test:e2e`) | |
| CI | `.github/workflows/ci.yml` | lint + test + build (+ e2e, planned) |

**Deployment target is Hostinger managed Node.js** (see the
`nextjs-deploy-hostinger` skill). MySQL was chosen over Neon Postgres
because Hostinger's IPv6 routing to Neon is a documented failure mode and
the team already operates MySQL + Drizzle on this host.

## 3. Directory map

```
app/
  layout.tsx            root layout: metadata, viewport, font, Providers
  (app)/                app shell group: AppHeader + BottomNav wrap all routes
    page.tsx            home / "Hoy" (first-run gate renders <Onboarding>)
    semana/[n]/         42 SSG week pages (precached offline)
    guias/, guias/[slug]/, guias/videos/
    herramientas/*      tools (journal, photos, kicks, contractions, weight,
                        checklists, carné, resumen, + new tools, Phase D)
    planeando/*         cycle mode (calendario, fertilidad, checklist)
    derechos/  emergencia/  directorio/  eventos/  ajustes/
    privacidad/  terminos/  error.tsx  not-found.tsx
  (auth)/               NEW: sign-in, consent, invite-accept screens
  admin/                NEW: founder panel — role-gated, robots-disallowed
  offline/              SW navigation fallback (standalone, no shell)
  global-error.tsx  not-found.tsx  sitemap.ts  robots.ts  sw.ts
  api/
    auth/[...nextauth]/ NEW: Auth.js route handler
    v1/                 placements | directory | go/[id] | health
                        NEW: sync | invites | push | stats | ai/baby | admin/*
components/             shared client components
lib/
  db.ts                 Dexie schema (see §4); db() throws server-side
  server/               NEW — server-only code. MUST NOT be imported by
    schema.ts             client components. Drizzle schema,
    auth.ts               Auth.js config, sync handlers, push sender.
    sync.ts
  pregnancy.ts cycle.ts weeks.ts dailyTips.ts   pure logic (unit-tested)
  derechos.ts emergency.ts checklists.ts preconception.ts   typed catalogs
  crypto.ts             PIN → PBKDF2 → AES-GCM note encryption
  backup.ts             full export/import of every table
  seed/                 articles.ts videos.ts events.ts directory.json …
docs/                   this file, BUILD-PLAN.md, FEATURE-MAP.md,
                        REDESIGN-PLAN.md, REVIEW-AND-LAUNCH-PLAN.md
scripts/                icon/OG/screenshot/image generators
```

## 4. The data contract (v3 — replaces the old privacy contract)

The old contract was "nothing personal ever leaves the device". With
accounts and sync that is no longer true, and pretending otherwise in the
UI would be dishonest. The new contract is narrower but still strict, and
it is what the privacy policy must say:

1. **The device is the source of truth; the server is a copy.** All health
   data is written to IndexedDB first and works fully offline. Sync is a
   background reconciliation, never a precondition for using the app.
2. **The user chooses whether to sync.** Account sign-in is the default
   path (it is what makes backup, multi-device and family sharing
   possible), but **"seguir sin cuenta"** remains available and keeps the
   app 100% device-local. A local user can link an account later and their
   existing data uploads then.
3. **Health payloads are opaque to the server.** Synced records are stored
   as a typed envelope (`user_id, store, record_id, updated_at, deleted_at,
   payload`) where `payload` is JSON the server never queries into, never
   indexes, and never uses for targeting. This keeps client-side
   encryption of the payload a future option rather than a rewrite.
4. **Photos do not leave the device in v1.** Belly photos and carné photos
   stay in IndexedDB and in the local backup file. Uploading them is a
   separate, explicitly opt-in feature and is not in the current plan.
5. **Aggregate stats are never joined to a user.** The "popular this week"
   counters (`/api/v1/stats`) write only `(week, content_id, day)` — no
   user id, no session, no IP retained.
6. **Ads and sponsors never receive personal data.** `/api/v1/go/[id]`
   still 302s to `wa.me` with fire-and-forget attribution carrying only
   id/trimester/department.
7. **Sign-in identity is the minimum Google/Facebook will give**: name,
   email, avatar URL. No friend lists, no other scopes, ever.
8. **The user can delete everything.** Account deletion wipes the server
   rows and offers a local wipe in the same flow. This is a hard
   requirement, not a nice-to-have — see §8.
9. Optional PIN still encrypts journal notes on-device (AES-GCM,
   PBKDF2 150k iters); only a salt + encrypted verifier persist.

**Any new feature must still be classified against this contract before
coding.** The question changed from "does this touch the server?" to
**"does the server learn anything it does not need, and can the user turn
it off and delete it?"**

### Dexie schema versions (append-only)
v1 core stores → v2 `photoEntries` → v3 `cycles`, `cycleSettings` →
v4 `carnePhotos`, `clinical` → **v5 adds sync bookkeeping**
(`updatedAt`/`deletedAt`/`dirty` on synced stores, plus a `syncState`
table). **Never renumber or edit past versions.** DB name is `mibebe`.

## 5. Data flow (v3)

```
Device                                   Server (Hostinger + MySQL)
┌──────────────────────────────┐         ┌────────────────────────────────┐
│ IndexedDB (Dexie v5)         │         │ Auth.js  /api/auth/*           │
│  source of truth, offline    │◀──────▶ │   Google · Facebook            │
│  dirty-flag queue            │  sync   │ /api/v1/sync  pull ?since=     │
│                              │         │               push {records[]} │
│ Service worker (Serwist)     │◀──push──│ /api/v1/push  (VAPID)          │
│  precache shell/42 weeks/    │         │ /api/v1/invites  family roles  │
│  guías; NetworkFirst APIs    │         │ /api/v1/stats    anonymous      │
│  /offline nav fallback       │         │ /api/v1/ai/baby  quota'd        │
│                              │         │ /api/v1/{placements,directory, │
│ Photos: NEVER uploaded (v1)  │         │   go/[id],health}              │
└──────────────────────────────┘         └────────────────────────────────┘
```

**Sync algorithm** (deliberately boring):
- Every synced row carries `updatedAt` (ms) and a soft `deletedAt`.
- Push: send rows where `dirty = 1`; server upserts if incoming
  `updatedAt` > stored `updatedAt` (last-write-wins), returns accepted ids.
- Pull: `GET /api/v1/sync?since=<ms>` returns rows changed after `since`;
  client applies the same comparison locally.
- Conflicts are resolved per record, not per table. For the one place
  where silent loss would hurt (journal notes), the loser is kept as a
  `conflicts` row and surfaced in the UI instead of discarded.
- Sync runs: on app open, on `online`, after a mutation (debounced), and
  from a periodic SW sync where supported. Never blocks the UI.

## 6. Accounts

- **Auth.js (NextAuth v5)** with the Drizzle adapter, JWT session in an
  httpOnly cookie. This is the first `Set-Cookie` in the app — the "no
  cookies" claim is gone from the copy and the policy.
- **Google** ships first (fast to provision). **Facebook Login requires
  Meta business verification + app review** for even `public_profile` and
  `email`, which takes days-to-weeks and needs the privacy policy URL live
  first — it therefore sits behind `AUTH_FACEBOOK_ENABLED` and does not
  block launch.
- **Roles per pregnancy** (`pregnancy_members`): `owner` (the pregnant
  user), `partner`, `family`. Owner has write access; the others are
  read-only in v1 and never see journal notes or photos.
- **"Seguir sin cuenta"** stays a first-class path (see §4.2). Everything
  except sync, family sharing, push and AI images works without an account.

## 7. Visual language (unchanged by this pivot)

The pastel/cream **Mi Bebé** language stays exactly as shipped in
`docs/REDESIGN-PLAN.md` (§1 tokens: cream `#FBF7F1`, terracotta `#C96342`,
brand green `#2F5D50`, ink `#322E29`, pastels rosa/celeste/salvia/lavanda/
arena, 16px cards, Nunito Sans 600–900). Preggers is a benchmark for
**layout, information architecture and feature set only** — none of its
dark navy/hot pink palette, none of its art, none of its copy.

## 8. Account deletion & data rights (hard requirement)

Storing health data against an identity raises the legal bar well above
where this app was. Non-negotiables before any account feature goes live
to real users:

- `/ajustes` → "Borrar mi cuenta" deletes all server rows for the user
  (records, memberships, invites, push subscriptions, AI images) and
  offers to wipe the device too.
- "Descargar mis datos" (already built) must include synced data.
- The privacy policy and terms must be **rewritten and reviewed by a
  lawyer** — the current `/privacidad` and `/terminos` are drafts written
  for a device-only app and are now actively wrong.
- Consent for storing health data is collected explicitly at sign-up, not
  buried in a "by continuing you agree" line.

## 9. Admin panel (`/admin`)

The founder needs to support real account holders, watch the business, and
control what costs money. Rules that are part of the design:

- Access is `users.role = admin`, seeded from an `ADMIN_EMAILS` allowlist.
  Checked server-side on every request. A non-admin gets a **404**, not a
  403 — the route's existence is not confirmed to strangers.
- `/admin` is `robots`-disallowed, absent from the sitemap, never linked
  from the app shell.
- **Admin sees metadata, never health content.** `sync_records.payload` is
  not rendered anywhere in the panel — not for support, not for debugging.
  The panel can say "37 registros de síntomas"; it cannot say what they
  are. This is the practical payoff of the opaque-envelope decision in
  §4.3, and support convenience is not a good enough reason to trade it.
- **Every mutating admin action writes an `admin_audit` row** (actor,
  action, target user, timestamp). Broadcasts and deletions especially.
- The panel is a product surface with its own quality bar — pastel
  language, same tokens — not a debug page.

Scope by phase: **A7** is the support floor (find user, account state,
deletion, invite repair). **Phase I** adds the support console, business
and content stats, the subscription/payment ledger, AI spend control, and
segmented push broadcasts.

## 10. AI baby image (opt-in, entertainment)

A generated "así podría ser tu bebé" portrait from parent photos.
Constraints that are part of the design, not polish:

- Parent photos are **sent to the model and not retained** — no storage of
  the inputs, no reuse, stated plainly in the consent step.
- The result is labelled entertainment, never a prediction, and lives in a
  clearly separate surface from medical content.
- Server-side only (the API key never reaches the client), with a
  **hard per-user monthly quota** enforced in the database.
- Cost is real money per image — see `docs/BUILD-PLAN.md` Phase F for the
  current figures and the quota maths; spend is watched from `/admin` (I4).

## 11. Conventions for continuing agents

- **Verification gates:** `npx tsc --noEmit`, `npm test`, `npm run lint`,
  `npm run build` all pass before every commit.
- **`DECISIONS.md` is append-only** — log every non-obvious choice.
- **`lib/server/*` is server-only.** Add `import "server-only"` at the top
  of each file. A client component importing it must fail the build.
- **Copy is es-PY voseo** (tomá, registrá, acercate), warm, non-alarmist.
  Medical claims carry the "no reemplaza la consulta" framing. Safety
  strings get Guaraní `textGu` companions.
- **Touch targets ≥44px**, mobile-first, max-w-md column, theme tokens
  only (no ad-hoc hex).
- **Seeds marked PLACEHOLDER never render.** Gate them (`PUBLISHED_*`
  pattern) — this now applies to directory, events and placements too.
- **New runtime dependencies** need a DECISIONS.md trade-off note.
- Tests: pure logic in `lib/*.test.ts`; API boundary behaviour in
  `app/api/v1/api.test.ts`; sync + auth get their own test files.
- Branch/PR flow: work on `claude/*` branches, push, PR to `main`.
