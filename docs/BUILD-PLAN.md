# Build plan — engineering work

> **v3 — July 2026 (rewritten).** The plan changed direction after the
> founder reviewed the Preggers benchmark and decided to:
> **(1)** build all 31 benchmarked features (`docs/FEATURE-MAP.md`),
> **(2)** keep the pastel/cream Mi Bebé palette,
> **(3)** add real accounts with Google/Facebook sign-in and a synced
> backend, **(4)** drop pop-up ads, **(5)** ship the AI baby image as an
> opt-in joy feature.
>
> Item (3) is an architecture change, not a feature: read
> `docs/ARCHITECTURE.md` §4–§8 before touching anything in Phase A.
>
> This file contains **code work only**. Founder-side data/content/legal
> tasks live in `docs/REVIEW-AND-LAUNCH-PLAN.md` §4.
>
> Status legend: each task lists **Done when** criteria. A task is complete
> only when those hold AND `npx tsc --noEmit`, `npm run lint`, `npm test`,
> `npm run build` pass. Append a `DECISIONS.md` entry for anything
> non-obvious.

---

## What changed from v2, and why it matters

The v2 plan was built around a hard constraint: **no server may ever see
personal data.** That constraint forced several features into weak shapes.
Accounts remove it, and four previously-compromised things become
straightforward:

| Feature | v2 (no server) | v3 (accounts) |
|---|---|---|
| Backup | manual JSON file the user must remember to export | automatic sync; new phone restores by signing in |
| Reminders | "check when the app opens" — barely a reminder | **real Web Push** (VAPID) through the existing SW |
| Partner | export a code the partner imports into a read-only view | actual shared pregnancy with roles |
| Popular content / analytics | impossible or heavily degraded | anonymous aggregate counters |

What it costs us, stated plainly so nobody is surprised later:

- **The "no accounts, nothing leaves your phone" differentiator is gone.**
  What remains — and it is the stronger moat anyway — is that this is the
  only pregnancy app built *for Paraguay*.
- **The legal bar rises.** Health data tied to an identity means the
  privacy policy and terms must be rewritten and lawyer-reviewed, consent
  must be explicit, and account deletion must actually delete
  (ARCHITECTURE.md §8). The current `/privacidad` and `/terminos` drafts
  describe a device-only app and are now **wrong**, not merely unfinished.
- **There is now infrastructure to run**: a database, backups, secrets,
  and an OAuth app per provider.
- **Offline-first must be defended.** Every phase below is written so the
  app still works with no network and no account. If a task breaks that,
  the task is wrong.

Mitigation kept from v2: **"seguir sin cuenta" stays a first-class path.**

---

## Already done (do not redo)

- Investor MVP: modes, 42 weeks, tools, derechos, emergencia, carné, PWA.
- **Phase 0 hardening**: backup/restore + `storage.persist()`, `/privacidad`
  + `/terminos` drafts, error/404/offline pages, pinch-zoom fix,
  placeholder video gallery gated, onboarding due-date entry, sitemap/robots,
  `/api/v1/go` rate limiting.
- **R1 rename** to "Mi Bebé" (internal ids renamed cleanly; DB name `mibebe`).
- **Redesign A/B/B.1/C**: pastel token system, AppHeader/BottomNav, Hoy
  screen, `/guias`, week photo hero, image pipeline
  (`npm run optimize:images`), typography sweep across all screens.
- **P1.1** install prompt · **P1.2** update toast · **P1.4** OG image +
  manifest screenshots · **P1.5** ESLint in CI · **P1.6** `/conoce` landing
  · **P1.7** Playwright E2E (4 specs, 6 tests).

Carried forward unchanged from v2, still to do: **P1.3** (now folded into
G2), **P2.3** content ops (now G1), **P2.4** tool depth (now D7),
**P2.5** Guaraní scaffolding (now D8), **P3.1** postpartum (now Phase H),
**P3.3** directory at scale (now D5/H3).

---

## Phase Z — pre-work that should not wait (½ day)

Small, already-identified defects. Independent of everything else; do
these first so the friends-and-family test is not embarrassed by them.

### Z1 Gate placeholder directory / events / placements
Standing rule "placeholder data never ships visibly" is only enforced for
videos. Today `Cerca tuyo` and `Eventos` — two of five nav tabs — render 21
invented sanatorios with dead `+595981000xxx` numbers, 5 invented sponsors,
and 8 invented charlas whose dates are computed at module load.
Apply the `PUBLISHED_*` pattern to all three, with warm empty states
("estamos armando el directorio — ¿conocés un lugar? escribinos").
**Done when:** no invented business, sponsor or event can render; tabs
light up automatically when real data lands; a unit test asserts every
placeholder is filtered.

### Z2 CI honesty
`npm run test:e2e` is not in CI despite P1.7 claiming it. Wire it in
(build once, reuse). Also fail a **production** build when
`NEXT_PUBLIC_MEDICAL_REVIEWER` is unset or still contains `___`, so the
placeholder byline cannot reach users.
**Done when:** CI runs lint + unit + e2e + build; a prod build with an
unset reviewer fails loudly.

---

## Phase A — accounts & sync foundation (largest single phase)

Everything in B–F assumes this exists. Do it in order; A1→A3 are a chain.

### A1 Database + Drizzle schema
MySQL on Hostinger + Drizzle ORM + migrations checked into the repo.
Tables: Auth.js core (`users`, `accounts`, `sessions`,
`verification_tokens`), plus `pregnancies`, `pregnancy_members`
(role: owner/partner/family), `sync_records`
(`user_id, pregnancy_id, store, record_id, updated_at, deleted_at,
payload JSON`), `push_subscriptions`, `invites`, `ai_generations`,
`content_stats`.
`lib/server/*` is server-only (`import "server-only"` at the top of every
file). Local dev works against a local MySQL via `DATABASE_URL`.
**Done when:** `npm run db:migrate` provisions a clean database; a
client component importing `lib/server/schema` fails the build; the app
still builds and runs with `DATABASE_URL` **unset** (local-only mode).

### A2 Auth.js with Google (Facebook flagged)
NextAuth v5 + Drizzle adapter, JWT session in an httpOnly cookie.
`/api/auth/[...nextauth]`, a branded sign-in screen in the pastel
language, and an explicit **consent step** for storing health data (not a
"by continuing" line). Facebook provider behind `AUTH_FACEBOOK_ENABLED`
— Meta business verification + app review takes weeks and needs a live
privacy-policy URL, so it must not block anything.
**Done when:** Google sign-in works end to end; sessions survive reload;
`/ajustes` shows the account; **"seguir sin cuenta" remains fully usable**
and is not a dead end.

### A3 Sync engine
Dexie v5 adds `updatedAt` / `deletedAt` / `dirty` to synced stores plus a
`syncState` table. `POST /api/v1/sync` (push) and `GET /api/v1/sync?since=`
(pull), zod-validated, last-write-wins per record. Runs on open, on
`online`, and debounced after mutations. Journal-note conflicts are kept
as a `conflicts` row and surfaced, never silently dropped.
**Photos are not synced** (ARCHITECTURE.md §4.4).
**Done when:** two browser profiles signed into the same account converge;
airplane-mode edits sync on reconnect; unit tests cover the LWW comparison
and the conflict path; e2e covers offline-edit → reconnect → converge.

### A4 Legal & consent rewrite
`/privacidad` and `/terminos` rewritten for the account world: what is
stored, where, who can see it, retention, deletion, the AI feature, push.
Marked clearly as pending lawyer review (founder task §4.5).
**Done when:** neither page claims data never leaves the device; the
consent step links to both.

### A5 Account management & deletion
`/ajustes`: signed-in identity, sign out, **"Borrar mi cuenta"** deleting
every server row (records, memberships, invites, push subs, AI images) and
offering a device wipe in the same flow. "Descargar mis datos" extended to
include synced data.
**Done when:** deletion leaves zero rows for that user, verified by a test;
the flow is reachable in ≤2 taps from Ajustes.

### A6 Link a local account
A user who started without an account and later signs in uploads their
existing local data instead of losing it or duplicating it.
**Done when:** local-only → sign-in results in exactly one copy of every
record on both sides.

---

## Phase B — onboarding & profile (feature map 1–8)

### B1 Roles (map #1)
`mamá / papá / acompañante / familiar o amiga` in onboarding and editable
later; drives tone and which home content shows. Non-owner roles get a
read-only shell.
**Done when:** every role reaches a coherent home screen; role is synced.

### B2 Baby identity & twins (map #2, #3)
Baby nickname threaded through copy ("Silvia ya mide…"); data model
supports N babies per pregnancy now, UI for twins later.
**Done when:** nickname appears wherever "tu bebé" is generic; adding a
second baby requires no schema migration.

### B3 Due-date & pregnancy settings (map #4, #5, #6)
Calculation methods (LMP · ecografía · FIV · conception date), adjustable
pregnancy length, `week+day` display **as the default**, separate planned
delivery date.
**Done when:** each method produces the correct FPP with unit tests;
switching method never corrupts existing week data.

### B4 Ajustes restructure
Group the growing settings into sections (cuenta · bebé · embarazo ·
notificaciones · privacidad · datos) so it stays navigable.

### B5 Notifications (map #7, #8) — replaces v2's P2.1
Real **Web Push** via VAPID and the existing service worker, now that a
server exists. Granular per-category opt-ins (consejos · recordatorios de
control · avisos). Permission requested **only** from the settings toggle.
Honest copy about iOS (installed PWA required).
**Done when:** a control reminder fires the day before on Android/Chrome;
each category can be turned off independently; declining permission
degrades gracefully.

---

## Phase C — the home screen (feature map 9–19)

The highest-leverage phase for the friends-and-family test: it is what
testers judge in ten seconds.

### C1 Week hero + stats (map #9, #10)
Circular hero with progress ring; `semana · días transcurridos · faltan`.
### C2 Weekly one-liner (map #11)
One concrete "what is happening now" sentence per week; 42 strings, code
ships with a graceful fallback so content can land later.
### C3 Size comparison tabs (map #12)
Tabs for tamaño / pie / mano, keeping the Paraguayan comparisons and cm/g.
### C4 Perspective switcher (map #13)
Same week, three entrances: para vos / para tu pareja / para la familia.
### C5 "De la obstetra" (map #14)
One bylined expert card per week, tied to `NEXT_PUBLIC_MEDICAL_REVIEWER`.
### C6 Week-linked article feed + read time (map #15, #17)
Articles keyed to the current week; read-time computed from word count.
### C7 Popular this week (map #16)
`/api/v1/stats` counters keyed `(week, content_id, day)` — **no user id,
no IP retained**; zod whitelist + tests like the other routes.
### C8 Shortcuts + feedback card (map #18, #19)
Quick actions (emergencia · carné · próximo control) and
"¿Cómo te está yendo?" routing to WhatsApp feedback during testing.

**Phase done when:** the home screen renders every block with real data
for any week 1–42, offline, in the pastel language, with no layout shift.

---

## Phase D — tools & content surfaces (feature map 20–24, 26)

### D1 Illustrated tools grid (map #20)
3-per-row grid with illustrations replacing the current text list.
### D2 New tools (map #21)
Kegel (timed exercises), **name picker with Guaraní names**, dental
health, diary, sleep. Name picker is the sharing magnet — build its share
card with E2.
### D3 Food lookup (map #23) — the single most valuable content asset
"¿Puedo comer…?" searchable database with a safe/caution/avoid verdict and
a one-line reason: tereré, mate, carne asada, chorizo, quesú Paraguay,
pescado de río (mercury), mandioca, chipa, yuyos, embutidos, sushi.
Data as validated JSON (G1 schema) so the founder/Gemini can extend it.
**Done when:** search is instant and offline; every entry has a reason and
a reviewer flag; unreviewed entries do not render.
### D4 Checklist as its own tab (map #24) + nav IA
Promote checklists to the bottom nav. Resolves the open 5-tab question:
proposed **Hoy · Guías · Checklist · Herramientas · Cerca tuyo**, with
Eventos and Beneficios living inside Cerca tuyo.
### D5 Directory category banners (map #26)
Image banner + count per category ("Sanatorios · 24 lugares"); server-side
filtering and pagination when listings pass ~100.
### D6 Training classes (map #22)
Stage-filtered classes with duration + equipment. Short, downloadable,
`sin equipo`. **Lowest priority in this phase** — needs video assets.
### D7 Tool depth (was P2.4)
Contractions 5-1-1 pattern hint; kicks history + "menos que tu ritmo
habitual" nudge; weight gain band behind a flag until the reviewer signs
the ranges.
### D8 Guaraní scaffolding (was P2.5)
Generalise `textGu` into a `<Bilingual>` component and apply beyond
`/emergencia`.

---

## Phase E — family, sharing & growth (feature map 25, 27, 29, 30, 31)

### E1 Family sharing (map #13 server half)
Invite by link/code → `pregnancy_members` with role; partner and family
get a read-only companion view that **never** shows journal notes or
photos. Replaces v2's export-code workaround (P3.2).
**Done when:** an invited partner sees the week, due date and next
appointment and nothing else; revoking access is immediate.
### E2 Share card + bump frame (map #30)
Web Share API from the week hero; canvas-rendered week card and a bump
photo frame. Health details never leave beyond the week number; the photo
is composited **on device**.
### E3 Invite a friend (map #31)
"Invitá a una amiga" sharing the install link; doubles as the test-round
feedback path.
### E4 Beneficios tab (map #27)
Browsable deals surface — **no pop-ups, no interstitials**. Hidden behind
the `PUBLISHED_*` gate until real partners exist.
### E5 "Qué necesitás de verdad" (map #25)
Not a price comparator (no Prisjakt equivalent in PY): a curated needs
list with realistic ₲ ranges and where to buy in Asunción.
### E6 FAQ accordion (map #29)
Reused for the privacy/account trust moment: ¿quién ve mis datos?
¿qué pasa si borro la app? ¿la obstetra revisa esto?

---

## Phase F — AI baby image (feature map, founder decision 5)

An opt-in "así podría ser tu bebé" portrait. Joy feature; walled off from
medical content by design (ARCHITECTURE.md §9).

### F1 Generation pipeline
`POST /api/v1/ai/baby`, **server-side only** (the API key never reaches
the client). Parent photos are sent to the model and **not retained**.
Result stored only if the user saves it. Explicit consent step naming what
is sent and that it is deleted.

### F2 Quota & cost control
Hard per-user monthly quota in `ai_generations`, enforced server-side
before any API call, plus a global kill switch env var.

**Cost, as of July 2026** (verify against Google's current price page
before launch — this moves):

| Tier | ≈ per image |
|---|---|
| Gemini image, standard ≤1024px | **≈ $0.04** (≈ ₲300) |
| 1K–2K tier | ≈ $0.13 |
| 4K | ≈ $0.15–0.24 |
| Batch API (24 h turnaround) | **half price** |

Plan on the ~$0.04 tier: 1024px is more than enough for a phone card.
Quota maths — **3 generations/user/month** at $0.04 ≈ $0.12/user/month;
1 000 active users ≈ **$120/month worst case** if every user maxes out
(real take-up will be far lower). Set the quota in an env var so it can be
cut without a deploy, and put a hard monthly spend ceiling in the same
place.

**Done when:** quota cannot be bypassed by a client; input photos are
provably not stored; the feature can be switched off with one env var; the
result is labelled entertainment everywhere it appears.

---

## Phase G — launch readiness

### G1 Content ops (was P2.3) — do this **before** the content push
Move articles, events, videos, directory, placements and the D3 food data
to validated JSON with zod schemas + `npm run validate:content` in CI:
slugs, dates, `+595` formats, department slugs, no placeholder ids, no
module-load timestamps. This is what lets Gemini-generated content and
founder edits land without TypeScript knowledge or code review — it is on
the critical path to launch, not a nicety.
**Done when:** an invalid entry fails CI with a readable message.

### G2 Analytics (was P1.3)
Aggregate product metrics off the existing tables + `content_stats`: 
installs, weekly active, retention, tool usage. No per-user behavioural
tracking beyond what the account inherently implies; disclosed in
`/privacidad`.

### G3 Performance & offline budget
The home screen grew a lot in Phase C. Re-check 3G budget, precache only
current ±1 week images, lazy-load the rest, verify Lighthouse.

### G4 Founder-content integration
Wire in the real directory, videos, events and articles once they exist,
removing the Z1 gates naturally.

---

## Phase H — the moat (post-launch)

### H1 Postpartum mode "Ya nació" (was P3.1)
Third `AppMode`; `baby`, `babyVaccines`, `postpartumChecks`; PAI vaccine
calendar computed from birth date (`lib/pai.ts`, unit-tested); puerperio
alarm signs with Guaraní; lactancia; Registro Civil checklist reuse.
Pregnancy data is preserved — mode switch, never a wipe.

### H2 Guaraní expansion beyond safety strings.
### H3 Directory at scale (18 departments, "reportar un dato incorrecto").
### H4 Institutional partnerships (consultorios, sanatorios, MSPBS/PAI alignment).
### H5 Monetisation rails: sponsored placements with real pricing, directory
"destacado" tier. **Any paid tier must use Tigo Money / Personal / bank
transfer** — card-first pricing does not work in Paraguay.

---

## Suggested sequencing

**To get the friends-and-family test running:** Z1 · Z2 · A1 · A2 · A3 ·
A4 · A5 · B1 · B2 · B3 · B5 · C1–C8 · D1 · D4 · E2 · E3.
That is a working, account-backed, synced app with the new home screen and
sharing — enough for real feedback, with demo content still gated.

**Then, in parallel with the content push:** G1 first (so content can
land), then D2 · D3 · D5 · E1 · E4 · E6 · F1 · F2 · A6 · B4 · D7 · D8.

**After launch:** G2 · G3 · G4 · D6 · E5 · Phase H.

---

## Standing rules for every task

1. Classify against the data contract (ARCHITECTURE.md §4) first. The
   question is now "does the server learn anything it does not need, and
   can the user turn it off and delete it?"
2. Gates: `npx tsc --noEmit` && `npm run lint` && `npm test` && `npm run build`.
3. **The app must keep working offline and without an account.** Any task
   that breaks either is wrong, no matter what it enables.
4. New pure logic ⇒ unit tests. New API surface ⇒ zod whitelist + tests.
5. Placeholder data never ships visibly (`PUBLISHED_*` pattern).
6. `lib/server/*` is server-only; `import "server-only"` at the top.
7. Append rationale to `DECISIONS.md`; keep this file's statuses updated.
8. es-PY voseo copy; safety-critical strings get Guaraní drafts.
9. Pastel/cream Mi Bebé tokens only — no ad-hoc hex, no borrowed palette.
