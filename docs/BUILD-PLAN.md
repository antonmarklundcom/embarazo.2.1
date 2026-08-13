# Build plan — engineering work

> **August 2026 — read `docs/OPUS-REVIEW-2026-08.md` before planning from this
> file.** An independent review found that this plan is sequenced for feature
> parity with Preggers rather than for reaching real users, and recommends
> (a) moving accounts/sync (A2–A7) off the launch path, (b) building B5 push
> **without** accounts, (c) promoting D3 (food lookup) into the first release,
> (d) deferring Phase F, and (e) adding **Phase J — Android/Play packaging**
> (`docs/ANDROID-LAUNCH.md`), which this plan is missing entirely despite Play
> being the founder's stated distribution target. Those are recommendations
> awaiting a founder decision; the phases below are unchanged until then.
>
> Also new, same review round: **`docs/FLO-BENCHMARK.md`** (the second
> inspiration app, which the 31-item Preggers map does not cover — community,
> AI assistant, symptom insight, courses, plus the Paraguay-only items no
> global app has) and **`docs/MVP-AND-MONETISATION.md`** (the v1.0 cut line,
> and why **§I3's Tigo Money / bank-transfer payment design violates Google
> Play's billing policy** for in-app digital goods — sponsorship, not
> subscriptions, is the day-one business).

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
>
> **Sizing, not time.** Tasks are marked **S / M / L**, which is about how
> much *review* they need, not calendar hours:
> **S** = one focused pass, self-contained, low risk — review the diff.
> **M** = one working session, several files, needs its own tests — review
> the behaviour, not just the diff.
> **L** = multiple sessions with checkpoints, changes shared contracts,
> should be split across commits so it can be reviewed as it lands.
> Do not read these as developer-days; that unit does not apply here.

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

## Phase Z — pre-work that should not wait

Small, already-identified defects. Independent of everything else; do
these first so the friends-and-family test is not embarrassed by them.

### Z1 Gate placeholder directory / events / placements — **S** ✅ DONE
Standing rule "placeholder data never ships visibly" is only enforced for
videos. Today `Cerca tuyo` and `Eventos` — two of five nav tabs — render 21
invented sanatorios with dead `+595981000xxx` numbers, 5 invented sponsors,
and 8 invented charlas whose dates are computed at module load.
Apply the `PUBLISHED_*` pattern to all three, with warm empty states
("estamos armando el directorio — ¿conocés un lugar? escribinos").
**Done when:** no invented business, sponsor or event can render; tabs
light up automatically when real data lands; a unit test asserts every
placeholder is filtered.

Shipped as `lib/seed/gate.ts`: a deep string scan (marker text, the
`+595 981 000 0xx` range, the stand-in YouTube id) rather than a per-type
field list, so an entry with real data but one leftover placeholder field
stays hidden instead of half-shipping. Filtering happens in `lib/wordpress.ts`
and the seed modules, which covers the API routes, the home resources block,
the directory page and the video gallery by construction. Empty states
rewritten to be honest ("estamos armando el directorio") — the Eventos tab now
distinguishes "no events at all" from "none in this department" and hides its
department filter in the former case. Covered by `lib/seed/gate.test.ts` (12
tests) and `e2e/placeholder-gate.spec.ts` (3 tests).

### Z2 CI honesty — **S** ✅ DONE
`npm run test:e2e` is not in CI despite P1.7 claiming it. Wire it in
(build once, reuse). Also fail a **production** build when
`NEXT_PUBLIC_MEDICAL_REVIEWER` is unset or still contains `___`, so the
placeholder byline cannot reach users.
**Done when:** CI runs lint + unit + e2e + build; a prod build with an
unset reviewer fails loudly.

Shipped as `lib/launchChecks.ts`, called from `next.config.ts`. The checks fire
only when `NEXT_PUBLIC_APP_URL` is set — that is the signal for "configured
deployment" as opposed to a local or CI compile check — with an awkward
`ALLOW_PLACEHOLDER_REVIEWER=1` escape hatch. **Also found and fixed while
here:** `MedicalReviewByline` fell back to "Revisado por el equipo médico de
Mi Bebé" when the env var was unset, i.e. it claimed medical review that had
not happened. Worse than a visible placeholder. It now renders nothing until a
real reviewer is configured. CI dropped its `Dra. ___` placeholder value and
gained `npx playwright install` + `npm run test:e2e` with trace upload on
failure.

---

## Phase A — accounts & sync foundation (largest single phase)

Everything in B–F assumes this exists. Do it in order; A1→A3 are a chain.

### A1 Database + Drizzle schema — **M** ✅ DONE
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
client component importing `lib/server/db` fails the build; the app
still builds and runs with `DATABASE_URL` **unset** (local-only mode).

Shipped: `lib/server/schema.ts` (12 tables), `lib/server/db.ts` (lazy pool,
`isDatabaseConfigured()`), `drizzle.config.ts`, initial migration in
`drizzle/`, and `db:generate` / `db:migrate` / `db:studio` scripts. Both
boundary conditions verified by building, not by assertion: a production build
passes with `DATABASE_URL` unset, and a deliberate client-component import of
`db.ts` fails the build with the server-only error. Note the guard sits on
`db.ts` rather than `schema.ts` — drizzle-kit reads the schema with plain Node
and cannot tolerate the shim (see DECISIONS.md). Data-contract invariants
(opaque payload, no identity on `contentStats`, no photos in `SYNCED_STORES`,
no prompt/photo columns on `aiGenerations`) are asserted in
`lib/server/schema.test.ts` so widening them fails a test.

### A2 Auth.js with Google (Facebook flagged) — **M** ✅ DONE
NextAuth v5 + Drizzle adapter, JWT session in an httpOnly cookie.
`/api/auth/[...nextauth]`, a branded sign-in screen in the pastel
language, and an explicit **consent step** for storing health data (not a
"by continuing" line). Facebook provider behind `AUTH_FACEBOOK_ENABLED`
— Meta business verification + app review takes weeks and needs a live
privacy-policy URL, so it must not block anything.
**Done when:** Google sign-in works end to end; sessions survive reload;
`/ajustes` shows the account; **"seguir sin cuenta" remains fully usable**
and is not a dead end.

Shipped: `lib/server/auth.ts` (lazy NextAuth v5 + Drizzle adapter, JWT
session, `isAuthAvailable()`), `app/api/auth/[...nextauth]/route.ts`, the
branded sign-in screen at `/cuenta` (`components/SignInCard.tsx`), the
account block on `/ajustes` (`components/AccountSection.tsx` +
`AccountCard.tsx`), and `users.healthDataConsentAt` /
`healthDataConsentVersion` (migration `drizzle/0001_orange_rage.sql`).
The consent step is enforced, not decorative: the checkbox mints a
short-lived httpOnly ticket and the Auth.js `signIn` callback refuses the
sign-in without one — and it runs *before* `handleLoginOrRegister`, so a
refused sign-in leaves no user row. Facebook is registered as a provider
only when `AUTH_FACEBOOK_ENABLED=true` **and** both credentials are
present; unflagged it does not exist anywhere in the running app. Local-only
mode is verified by running the production build with `AUTH_SECRET`,
`AUTH_GOOGLE_*` and `DATABASE_URL` all unset: the app serves every screen,
sets no session cookie, and `/api/auth/*` 404s instead of 500-ing. Covered
by `lib/auth/config.test.ts` (18), `lib/auth/consent.test.ts` (12) and
`e2e/account.spec.ts` (3).

### A3 Sync engine — **L** ✅ DONE
Dexie v5 adds `updatedAt` / `deletedAt` / `dirty` to synced stores plus a
`syncState` table. `POST /api/v1/sync` (push) and `GET /api/v1/sync?since=`
(pull), zod-validated, last-write-wins per record. Runs on open, on
`online`, and debounced after mutations. Journal-note conflicts are kept
as a `conflicts` row and surfaced, never silently dropped.
**Photos are not synced** (ARCHITECTURE.md §4.4).
**Done when:** two browser profiles signed into the same account converge;
airplane-mode edits sync on reconnect; unit tests cover the LWW comparison
and the conflict path; e2e covers offline-edit → reconnect → converge.

Shipped as `lib/sync/*` (stores · merge · protocol · client · signal),
`lib/server/sync.ts`, `app/api/v1/sync/route.ts`, Dexie **v5** in `lib/db.ts`,
`components/SyncProvider.tsx` and `components/SyncConflicts.tsx`. **Read the
"A3 — sync engine" section of DECISIONS.md before building anything that
writes to a synced store** — it is written as the contract, not as a diary.
The short version: existing `db().x.add(...)` call sites are unchanged (Dexie
hooks stamp `uid`/`updatedAt`/`deletedAt`/`dirty`, so the rule can't be
forgotten by a future call site), but deletes must go through
`softDelete(store, id)` and reads through `notDeleted(rows)`. Two corrections
to earlier work were forced here and both are load-bearing: A1's
`SYNCED_STORES` named six tables that do not exist and omitted `pregnancy`
(one canonical list now lives in `lib/sync/stores.ts`, imported by both ends),
and the pull cursor needed a **server-authored** `serverUpdatedAt` column —
ordering the pull by the client's `updatedAt` silently loses every record
written by a phone that was offline, and the convergence tests fail without
the split. PIN-encrypted journal notes are deliberately **not** synced
(the key is device-local; §3.2 of the August review), the record travels with
`noteWithheld` and a withheld payload can never blank a note the receiving
device still holds. Singleton stores (`profile`, `pregnancy`, `cycleSettings`,
`clinical`) use a fixed record id so two offline onboardings merge instead of
duplicating. Covered by `lib/sync/merge.test.ts` (24),
`lib/sync/protocol.test.ts` (15), `lib/server/sync.test.ts` (15 — two devices
against the real handlers) and `e2e/sync.spec.ts` (3 — a real browser going
offline and back, including that the app is completely unchanged when
`/api/v1/sync` 404s, which is the "seguir sin cuenta" guarantee).

### A4 Legal & consent rewrite — **S** ✅ DONE
`/privacidad` and `/terminos` rewritten for the account world: what is
stored, where, who can see it, retention, deletion, the AI feature, push.
Marked clearly as pending lawyer review (founder task §4.5).
**Done when:** neither page claims data never leaves the device; the
consent step links to both.

Shipped as a copy-only rewrite of `app/(app)/privacidad/page.tsx` and
`app/(app)/terminos/page.tsx`. Both now lead with "sin cuenta todo se queda
en tu teléfono, con cuenta esto viaja" instead of the old blanket "no te
pedimos cuenta" claim, and privacidad gained sections for what syncs with an
account, who can see it (companion view sees week/due date/next control
only, never notes or photos; support sees counts, never payload — the A7/I1
rule stated in advance of those tasks existing), retention/deletion (manual
WhatsApp request today, self-serve button noted as forthcoming since A5
hasn't shipped — deliberately not claiming a self-serve flow that doesn't
exist yet), the AI baby image (F1, described as forthcoming/opt-in since it
isn't built), and push (B5, forthcoming, opt-in per category). No functional
change: `SignInCard`'s consent checkbox already linked to both pages (A2),
so that "done when" criterion was already met and is preserved unchanged.
`CONSENT_VERSION` was **not** bumped — the consent checkbox text itself
(what the account world actually asks the user to accept) didn't change,
only the standalone legal pages it links to.

### A5 Account management & deletion — **M** ✅ DONE
`/ajustes`: signed-in identity, sign out, **"Borrar mi cuenta"** deleting
every server row (records, memberships, invites, push subs, AI images) and
offering a device wipe in the same flow. "Descargar mis datos" extended to
include synced data.
**Done when:** deletion leaves zero rows for that user, verified by a test;
the flow is reachable in ≤2 taps from Ajustes.

Shipped as `lib/server/account.ts` (`deleteAccountData` over an executor
interface + `drizzleAccountExecutor`), `app/(app)/ajustes/actions.ts`
(zod-whitelisted server action; the user id comes from the session, never the
body) and `components/DeleteAccountCard.tsx`, mounted directly under the
identity card so the flow is open → confirm. The device wipe is a checkbox in
the same flow and runs *before* the server call, so a network failure halfway
leaves a user who asked for a wipe with a wiped phone. The test that matters is
not the row count but `TABLE_DISPOSITION`: it names every table in `schema` and
what deletion does to it, and a test asserts the list matches `schema` exactly
— so E1's and B5's new tables cannot quietly survive a "borrá todo".
`adminAudit` is the one table deliberately retained (it is what makes admin
access defensible, holds no health content, and its ids resolve to nobody once
the user row is gone); `contentStats` is untouched because it carries no
identity to begin with. "Descargar mis datos" now runs a sync pull first, so
the export includes records written on another device. Covered by
`lib/server/account.test.ts` (8).

### A6 Link a local account — **M** ✅ DONE
A user who started without an account and later signs in uploads their
existing local data instead of losing it or duplicating it.
**Done when:** local-only → sign-in results in exactly one copy of every
record on both sides.

Shipped as `lib/sync/link.ts` (`decideAccountLink`), `syncState.accountId`,
`accountId` on the sync responses, and `components/SyncStatusCard.tsx`. The
upload path itself needed no new code — A3's design already gives it: a
local-only user's rows are all `dirty = 1`, and singleton stores share a fixed
record id, so the profile and pregnancy *merge* rather than duplicating. What
A6 adds is the guard beside it. A3 had no notion of which account local data
belonged to, so *sign in as A → sync → sign out → keep using the app → sign in
as B* uploaded A's health records into B's account — two taps from Ajustes.
Now an unset account adopts (the link), a matching one continues, and a
different one **refuses**, pushing nothing and pulling nothing (pulling would
mix two people's data on the device instead of on the server). Covered by
`lib/sync/link.test.ts` (9) and two new e2e in `e2e/sync.spec.ts`: a
local-only user's data uploading exactly once on sign-in, and data staying put
when a different account signs in on the same phone.

### A7 Admin role + `/admin` shell (minimum viable support) — **M** ✅ DONE
Needed as soon as there are accounts to support — a founder who cannot
answer "I lost my data / I can't sign in / delete my account" has an
account system they cannot operate. Full panel is Phase I; this is the
floor.
- `users.role` (`user` | `admin`), seeded from an `ADMIN_EMAILS` allowlist
  so the first admin exists without a chicken-and-egg problem.
- `/admin` route group: server-side role check on every request,
  `robots` disallow, excluded from the sitemap, never linked from the app.
- v1 screens: find a user by email; see account state (created, providers,
  last sync, record counts per store, device count); trigger a
  support-requested account deletion; resend/repair a family invite.
- **Every admin action writes an `admin_audit` row** (who, what, which
  user, when). No exceptions — this is what makes the access defensible.
**Privacy limit, non-negotiable:** admin sees **metadata only, never
health content**. `sync_records.payload` is not rendered anywhere in
`/admin`, not even for support. The panel shows "37 registros de síntomas",
never what they say. This is what ARCHITECTURE.md §4.3 buys and it must not
be traded away for support convenience.
**Done when:** a non-admin hitting any `/admin` URL gets a 404 (not a 403
— do not confirm the route exists); every mutating action is audited; a
test asserts no route returns payload contents.

Shipped as `lib/admin/allowlist.ts` + `lib/admin/audit.ts` (pure),
`lib/server/admin.ts` (`requireAdmin`, `recordAudit`, metadata-only queries),
the `app/admin` route group (search by email · account state ·
`/admin/usuarios/[id]`), `app/admin/actions.ts` (support deletion, invite
revoke/extend) and `components/admin/AdminUserActions.tsx`. The guard lives in
the layout so it covers every future route by construction, and every action
re-authorises anyway — an action is a POST endpoint and does not inherit a
layout's guard. **Found and fixed while here:** `title: "Panel"` in the admin
layout leaked into the `<title>` of the 404 a stranger receives, because Next
resolves a segment's static metadata even when the layout throws `notFound()`
— exactly the "do not confirm the route exists" rule, broken by a metadata
export. The "no payload" requirement is enforced by scanning the admin source
(comments stripped) rather than a response body: that covers every route in
the group including Phase I's, and two extra assertions stop the scan from
passing vacuously. Support deletion reuses A5's `deleteAccountData`, so A5's
`TABLE_DISPOSITION` coverage test protects this path too. Covered by
`lib/admin/allowlist.test.ts` (9) and `e2e/admin.spec.ts` (3).

---

## Phase B — onboarding & profile (feature map 1–8)

### B1 Roles (map #1) — **M** ✅ DONE
`mamá / papá / acompañante / familiar o amiga` in onboarding and editable
later; drives tone and which home content shows. Non-owner roles get a
read-only shell.
**Done when:** every role reaches a coherent home screen; role is synced.

Shipped as a new onboarding step between mode and date/department
(`components/Onboarding.tsx`), a `role?: Role` field on `Profile`
(`lib/db.ts` — plain non-indexed field, no Dexie version bump, same pattern
as `sanatorioName` etc.), and `lib/roleCopy.ts`: the single place that maps
a role to phrasing (`ROLE_LABELS`, `ROLE_ONBOARDING_COPY`,
`pregnancyPossessive`, `babyAtWeekLabel`, `moodCheckInLabel`), unit-tested
(9 tests). Editable later from a new "¿Cómo te describís vos?" section in
`/ajustes`, next to the existing mode switcher. Wired into the home screen's
most prominent role-sensitive strings: the week-hero image alt text and
caption, the "para leer hoy" card, and the daily mood check-in header
(second person for mamá, third person otherwise). `role` defaults to
`"mama"` everywhere it's read (`useProfile`, both `db().profile.add` call
sites) so existing profiles without the field keep their current behaviour
exactly. Synced automatically — `profile` is already in `SYNCED_STORES`
(A3) and the whole row travels as the opaque payload, so no sync-layer
change was needed for "role is synced".

**Scope boundary, stated explicitly**: "every role reaches a coherent home
screen" was interpreted as the pregnancy ("embarazada" mode) home screen,
the flagship surface. `PlaneandoHome` (the fertility/TTC dashboard) is
inherently about the mamá's own cycle data and was left role-copy-untouched
— rewriting it per-role is judged out of scope for an M task and better
suited to whichever future task actually redesigns that screen. The "read
mostly-only shell" language for non-owner roles is E1's job (family sharing
between *different* accounts); B1 is single-device and stores the role
locally, so there is no second person to restrict yet — role here drives
tone only, as the done-when criteria require.

### B2 Baby identity & twins (map #2, #3) — **M** ✅ DONE
Baby nickname threaded through copy ("Silvia ya mide…"); data model
supports N babies per pregnancy now, UI for twins later.
**Done when:** nickname appears wherever "tu bebé" is generic; adding a
second baby requires no schema migration.

Shipped as `babies?: BabyIdentity[]` on `Profile` (`lib/db.ts`) — an object
per baby, not a bare string array, so a later task can add per-baby fields
(e.g. sex) without a migration; index order is birth order. Plain
non-indexed field, no Dexie version bump. `lib/babies.ts` is the single
place that reads a `BabyIdentity[]` and produces copy
(`primaryBabyName`, `babyAtWeekLabel`, `babyNamesList`, `isTwinsOrMore`),
unit-tested (14 tests) — unnamed babies (including unnamed twins) fall back
to "Tu bebé" rather than guessing an order like "Bebé 1". Onboarding gained
an optional nickname field on the department step (embarazada mode only);
Ajustes gained a "Nombre de tu bebé" section with add/remove rows so a
second name (twins) is literally pushing to the array — no code change
needed to support it. Wired into the home screen's three generic "tu bebé"
spots: the week-hero image alt text and caption, and the "para leer hoy"
card. `/semana/[n]` was deliberately left untouched — it's statically
generated for all 42 weeks (offline precache), and reading per-device
Dexie state there would mean converting it to a client component and losing
that precache strategy; a future task can revisit if that tradeoff is
judged worth it.
- **Independent PR base**: this branch was cut from `main`, not from B1
  (roles), since PRs land independently. `app/(app)/page.tsx`'s `HeroCard`/
  `ReadCard` will conflict with B1's role-copy changes on merge — an
  expected, easily-resolved conflict from two PRs touching the same file,
  not a sign either task did something wrong.

### B3 Due-date & pregnancy settings (map #4, #5, #6) — **M** ✅ DONE
Calculation methods (LMP · ecografía · FIV · conception date), adjustable
pregnancy length, `week+day` display **as the default**, separate planned
delivery date.
**Done when:** each method produces the correct FPP with unit tests;
switching method never corrupts existing week data.

Shipped as four `lmpFrom*` functions in `lib/pregnancy.ts` — `lmpFromEcografia`
(alias of the existing `lmpFromDueDate`, kept as a separate named function so
call sites read as "which method" not "which formula"), `lmpFromFiv`
(transfer date − (14 + embryo day), standard obstetric convention for day-3/
day-5 transfers), and `lmpFromConception` (conception date − 14-day luteal
offset) — every method converges on an LMP-equivalent, since week/trimester/
due-date math is already defined purely in terms of LMP, so adding a method
never touches that math. `getDueDate`/`lmpFromDueDate`/`getDaysRemaining` all
gained an optional `gestationDays` param (default `GESTATION_DAYS`=280) for
the adjustable-length requirement. Unit-tested (16 new tests in
`lib/pregnancy.test.ts`), including that FIV/conception dating correctly
starts gestational age ahead of zero (a day-5 transfer is already 19 days/
week 3 at the moment of transfer, not "day zero" — a bug this exact test
class exists to catch).

`Pregnancy` (`lib/db.ts`) gained `method`, `gestationDays`, and
`plannedDeliveryDate` — all optional, plain non-indexed fields, no Dexie
version bump. Onboarding's binary "LMP vs. due date" checkbox became a
4-option method selector (`components/Onboarding.tsx`); Ajustes gained a
"Duración del embarazo" + "Fecha de parto planificada" section, separate
from the existing LMP/due-date editor. **"Switching method never corrupts
existing week data"** holds by construction, not by a special code path:
every method's output is just a new `lmpDate` written through the same
`db().pregnancy.update`/`.add` calls the pre-B3 editor already used — there
is nothing method-specific stored that could go stale.

`week+day` as the default: `formatWeekPlusDay` (e.g. "24+3", days omitted
when zero) applied to the home hero's small overline
(`SEMANA {weekPlusDay} · {trimestre}`). The big hero number and
`/emergencia`'s "Estoy embarazada de…" line keep the existing sentence form
(`formatCompletedGestation`, "24 semanas y 3 días") — that's prose, not a
label, and the compact form would read oddly there. A full hero-card
redesign is C1's job; this task only swapped the one label that was a bare
week integer into the week+day default, to avoid churn against C1's
upcoming PR.

### B4 Ajustes restructure — **S** ✅ DONE
Group the growing settings into sections (cuenta · bebé · embarazo ·
notificaciones · privacidad · datos) so it stays navigable.

Shipped as a new `SettingsGroup` wrapper in `AjustesClient.tsx` (an
uppercase eyebrow label + spaced stack, matching the eyebrow-label pattern
already used elsewhere in the app, e.g. `SignInCard`) applied around the
existing sections with **no functional change** — same components, same
state, same save handlers, just grouped: **Cuenta** (account block),
**Embarazo** (modo de uso, departamento, fecha de embarazo, próximo
control), **Privacidad** (PIN, resumen de privacidad, aviso médico),
**Datos** (copia de seguridad, instalar la app, borrar todos mis datos).
Two sections moved a few lines (privacy summary + aviso médico now sit next
to the PIN section instead of between backup and the danger zone) so each
group's sections are contiguous; nothing was reworded.
**Bebé and Notificaciones are not rendered** — B2 (baby identity) and B5
(push) haven't landed on `main` yet, so there is no content for either
group today, and an empty section header would be worse than no header.
Both PRs (B2 already open as #19) should wrap their new
sections in `<SettingsGroup title="Bebé">` / `"Notificaciones"` when they
land, reusing this component rather than inventing another grouping
pattern.

### B5 Notifications (map #7, #8) — replaces v2's P2.1 — **L** ✅ DONE
Real **Web Push** via VAPID and the existing service worker, now that a
server exists. Granular per-category opt-ins (consejos · recordatorios de
control · avisos). Permission requested **only** from the settings toggle.
Honest copy about iOS (installed PWA required).
**Done when:** a control reminder fires the day before on Android/Chrome;
each category can be turned off independently; declining permission
degrades gracefully.

Shipped as `lib/push/{categories,vapid,client}.ts`, `lib/server/push.ts`,
`/api/v1/push` (+ `/dispatch`), push handlers in `app/sw.ts` and
`components/PushSettings.tsx` (the "Notificaciones" section B4 left open).
Migration `drizzle/0003_*.sql` adds `pushReminders` and makes
`pushSubscriptions.userId` nullable. **The design is the contract** — read
DECISIONS.md "B5": the server sends **no payload**, so it knows an endpoint, a
category and a fire time, and the service worker composes the sentence locally
from IndexedDB. That is what lets prenatal reminders exist without the server
reading `syncRecords.payload`, and it is why there is no new dependency
(`web-push` exists to do encryption a bodyless push does not need; an ES256
JWT is 30 lines of `node:crypto`, verified against node's own verifier).
Push works **without an account**. A5's table-coverage test caught
`pushReminders` immediately, as designed — reminders are keyed by endpoint, so
deletion now resolves a user's endpoints before dropping their subscriptions.
Covered by `lib/push/vapid.test.ts` (10) and `lib/push/categories.test.ts`
(13).

---

## Phase C — the home screen (feature map 9–19)

The highest-leverage phase for the friends-and-family test: it is what
testers judge in ten seconds.

### C1 Week hero + stats (map #9, #10) — ✅ DONE
Circular hero with progress ring; `semana · días transcurridos · faltan`.

Shipped as `WeekHero` (`app/(app)/page.tsx`), replacing the flat rectangular
`HeroCard`: a circular week photo (with the existing arena-fallback-on-error
behavior kept) ringed by an SVG progress circle — `stroke-dasharray`/
`strokeDashoffset` against `getProgressFraction(lmp)`
(new pure function in `lib/pregnancy.ts`, unit-tested — 0 at LMP, 1 at the
due date, clamped so an overdue pregnancy doesn't overshoot a full circle).
Below it, the three-stat row feature map #10 asks for explicitly: **Semana**
(`week`), **Días pasados** (`getDaysSinceLMP`), **Faltan** (`getDaysRemaining`)
— all three already existed as functions, this task just surfaces them as
first-class numbers instead of leaving them implicit in the "17 semanas y 2
días" sentence.

**This is the layout shell C2–C8 fill in.** A comment in `page.tsx` marks the
slot area between the hero and the existing tool/reading rails; each of
those tasks adds one block there (weekly one-liner, size tabs, perspective
switcher, obstetra card, article feed, popular-this-week, shortcuts+feedback)
rather than restructuring the hero itself. Verified visually with a
Playwright screenshot at a phone viewport (390×844) in addition to the
automated gates — the ring renders correctly, no layout shift against the
skeleton placeholder (`HomeSkeleton`'s height was adjusted to match the
taller circular hero + stats row).
### C2 Weekly one-liner (map #11) — ✅ DONE
One concrete "what is happening now" sentence per week; 42 strings, code
ships with a graceful fallback so content can land later.

Shipped as `lib/seed/weeklyLines.json` (42 strings, es-PY voseo),
`lib/seed/weeklyLines.ts` (`weeklyLine(week) → string | null`) and
`components/WeeklyLineCard.tsx`, mounted as the first block in C1's slot area —
directly under the hero, above the appointment banner and the tip, because it
is the two-second answer. **The fallback is a real path, not a comment**: an
unknown week renders *nothing* — no empty card, no "próximamente" — since the
strings and the code that shows them land on different schedules and a gap
nobody can see beats a promise. The line is deliberately not `milestone` from
`lib/weeks.ts`: that stays the paragraph on the week detail page, this is the
single line the home screen leads with, and the schema enforces the difference
with a 110-character cap whose error message says where longer text belongs.
Content follows G1 — validated JSON, keyed by week so "two entries for semana
24" is a CI failure, checked at import time and in `npm run validate:content`
— and runs through Z1's `publishedOnly` gate so a week left as placeholder text
mid-content-pass falls back instead of shipping. Covered by
`lib/seed/weeklyLines.test.ts` (11, including the voseo check) and
`e2e/weekly-line.spec.ts` (1).
### C3 Size comparison tabs (map #12) — ✅ DONE
Tabs for tamaño / pie / mano, keeping the Paraguayan comparisons and cm/g.

Shipped as `lib/seed/limbSizes.json` (weeks 9–42), `lib/seed/limbSizes.ts` and
`components/SizeTabs.tsx`, mounted in C1's slot area. The "tamaño" tab is
served by `lib/weeks.ts`, unchanged — the Paraguayan comparisons (mandioca,
mamón, chipa) are the thing this product exists to have, so C3 adds tabs
*beside* them rather than a new size vocabulary. **A tab whose data does not
exist is not rendered**: before week 9 there is no foot to measure, so the card
degrades to the single tab it has always been able to show instead of a panel
of dashes. Real `role="tablist"` semantics with arrow-key movement, and the
active tab is resolved by lookup rather than trusted from state, so a week that
loses a tab cannot render an empty panel. The data risk (a decimal point in the
wrong place claiming an 18 cm foot) is handled in three places: a schema range
cap with an error message that names the likely cause, a monotonicity test that
catches a transposed digit a range check would pass, and a test that pins week
40 near a real newborn's ~8 cm. Measurements are formatted "8,2 cm" — es-PY
writes the decimal comma, and this is a number read aloud to somebody else.
Covered by `lib/seed/limbSizes.test.ts` (11) and `e2e/size-tabs.spec.ts` (2).
### C4 Perspective switcher (map #13) — ✅ DONE
Same week, three entrances: para vos / para tu pareja / para la familia.

Shipped as `lib/seed/perspectives.json`, `lib/seed/perspectives.ts` and
`components/PerspectiveSwitcher.tsx` in C1's slot area. It exists because an app
that only ever addresses the pregnant person leaves the two people most likely
to be reading over her shoulder with nothing concrete to do. **Content is stored
as week ranges, narrowest wins** — seven bands of real writing ship today, and a
later content pass deepens any single week by adding `{fromWeek: 24, toWeek: 24}`
with no code change. That was chosen over 126 per-week strings written in one
sitting, which would have been filler, and filler here is worse than a paragraph
that holds for six weeks (DECISIONS.md "C4"). B1's role picks the **opening**
tab — a papá does not tap past "para vos" every week — but nothing is hidden by
role: the pregnant user reading the pareja tab, and showing it to somebody, is
half of what the block is for. `selectBand` is exported and tested directly, so
the override rule is verified rather than re-implemented in a test. Covered by
`lib/seed/perspectives.test.ts` (9, including full 1–42 coverage with no gap or
overlap) and `e2e/perspective.spec.ts` (2).
### C5 "De la obstetra" (map #14) — ✅ DONE
One bylined expert card per week, tied to `NEXT_PUBLIC_MEDICAL_REVIEWER`.

Shipped as `lib/seed/obstetraNotes.json` (42 notes),
`lib/seed/obstetraNotes.ts` and `components/ObstetraCard.tsx` in C1's slot area.
**The byline is the gate, not a decoration**: with no configured reviewer the
card does not render at all — not unsigned, not under a generic "el equipo
médico", which is exactly the claim Z2 removed from `MedicalReviewByline`. It
branches on the same `isPlaceholderReviewer` the build check uses, so there is
one definition of "there is no reviewer" rather than two, and a source scan
asserts no fallback byline can be added later. Content is the **Paraguayan
prenatal calendar** — laboratorio inicial, the 11–14 and 18–22 ecografías, the
24–28 curva de azúcar, dTpa at 27–36, estreptococo B at 35–37, the carné
perinatal, factor Rh — because fixed local windows are what a translated global
app gets wrong. Those windows are asserted at the weeks a user would look them
up, so a content edit cannot quietly move the ecografía morfológica. **The 42
strings are drafts awaiting a signature** and cannot reach a user before there
is one; signing them off is part of what the founder's reviewer is agreeing to.
Covered by `lib/seed/obstetraNotes.test.ts` (8) and `e2e/obstetra-card.spec.ts`
(1, which asserts whichever side of the gate the build is on — **both sides were
run**: with the reviewer unset the card is absent, with one set it renders with
the byline).
### C6 Week-linked article feed + read time (map #15, #17) — ✅ DONE
Articles keyed to the current week; read-time computed from word count.

Shipped as `lib/articles/{forWeek,readTime}.ts` (both pure),
`components/WeekArticleFeed.tsx`, optional `fromWeek`/`toWeek` on
`ArticleSchema`, and a read-time line on `/guias` and each guía. It **replaces**
the old "Para leer hoy" rail, whose three cards pointed at two destinations
(the week page and `/guias`, twice). Now week 34 is offered the bolso del
sanatorio, week 38 the trámites guía, week 8 the control prenatal one.
**An article with no range is relevant to the whole pregnancy** (señales de
alarma, dengue) and stays in the pool as a fallback, sorting last — that is what
stops week 17, which no guía names specifically, from showing an empty rail, and
a test asserts every week 1–42 has something. Ties keep the file's order, so a
content editor changes what leads by moving an entry rather than by discovering
an invisible rule. Read time is **computed from the body, never stored** — a
stored figure is one somebody must remember to update — at 180 wpm (Spanish, on
a phone, practical list-heavy text), never zero, and the tag-stripping is tested
against the `<li>uno</li><li>dos</li>` case that would otherwise halve every
list-heavy guía. Covered by `lib/articles/readTime.test.ts` (7),
`lib/articles/forWeek.test.ts` (8) and `e2e/article-feed.spec.ts` (2).

**Cost recorded for G3:** filtering by week happens on the device, so
`lib/seed/articles.json` is now in the client bundle — the home route went from
12.7 kB / 171 kB First Load to 20.5 kB / 192 kB, and ~13 kB of that is article
HTML the home screen never renders. The fix is a build-time index carrying only
slug/title/range/minutes, which is real machinery (a generated file plus a
freshness check) and belongs in G3's budget pass rather than smuggled into a
content task.
### C7 Popular this week (map #16) — ✅ DONE
`/api/v1/stats` counters keyed `(week, content_id, day)` — **no user id,
no IP retained**; zod whitelist + tests like the other routes.

Shipped as `lib/stats/contentStats.ts` (pure wire format), `lib/server/stats.ts`,
`/api/v1/stats`, `components/RecordContentView.tsx` and
`components/PopularThisWeek.tsx`. No migration — `contentStats` existed from A1.

**One deliberate deviation from the line above, and it is the whole design
note:** this task was specified before J3, and its `(week, content_id, day)` key
would have put the pregnancy week — health data derived from the due date — back
on the wire, which is exactly the parameter J3 stripped from three other routes
so the Play listing can keep saying "No data collected". So **the week is not
transmitted**. The POST body is one field (`contentId`), `.strict()`, and the
`week` column is written as `0` — the "not applicable" value A1 already defined.
"Esta semana" therefore means the last seven days, which is also the better
product answer: what other mothers are reading *right now*. J3's source scan was
extended to cover `/api/v1/stats`, so the promise now grows with the routes
rather than describing only the three that existed when it was made.

No session is read anywhere — this counter works without an account, which is
the majority path, and reading a session would put an identity beside a table
that has no identity column. The IP is a one-minute in-memory rate-limit key and
reaches nothing. With no database the route answers an empty list and the rail
does not render: an empty "lo más leído" box on a new app is a billboard saying
nobody is here. Covered by `lib/stats/contentStats.test.ts` (10, including
source scans that the route never reads a session and the recorder sends only
the id), the extended `app/api/v1/api.test.ts` (12) and `e2e/stats.spec.ts` (3).
### C8 Shortcuts + feedback card (map #18, #19) — ✅ DONE
Quick actions (emergencia · carné · próximo control) and
"¿Cómo te está yendo?" routing to WhatsApp feedback during testing.

Shipped as `components/HomeShortcuts.tsx` in C1's slot area: three tiles for the
screens you cannot go looking for when you suddenly need them, and the feedback
card for the testing round.

**Also found and fixed while here — a Z1-class defect in shipped code.** Three
screens carried `process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000"`,
so with the variable unset (its state today) every one of those buttons opened a
WhatsApp chat with nobody. One of them was **"Contactar a mi sanatorio" on the
contractions screen** — a dead number offered to a woman timing contractions,
and *our* number was never the right destination for "mi sanatorio" anyway. Now:
`businessWhatsApp()` in `lib/whatsapp.ts` is the single way to ask for that
number and answers `null` for the all-zero fallback, Z1's `+595 981 000 0xx`
seed range, and anything that is not a real `+595` number; the directorio and
eventos empty states drop the button entirely when there is none; and the
contractions screen uses **the sanatorio number the user saved herself**
(`/emergencia`), falling back to the emergency screen with the national numbers
rather than to us. `useProfile` exposes `sanatorioPhone` for that.

The feedback pre-fill names the week, unlike J3's directory pre-fill: the
difference is that this text goes into a message the user reads before pressing
send, with no server in the path — J3's case sent the week through `/api/v1/go`
on every tap. Covered by `lib/whatsapp.test.ts` (7) and `e2e/shortcuts.spec.ts`
(3, one of which sweeps four screens for a `wa.me/5950…` link).

**Phase done when:** the home screen renders every block with real data
for any week 1–42, offline, in the pastel language, with no layout shift.

---

## Phase D — tools & content surfaces (feature map 20–24, 26)

### D1 Illustrated tools grid (map #20) — ✅ DONE
3-per-row grid with illustrations replacing the current text list.

Shipped as `components/ToolIcon.tsx` (one line-art set, one stroke weight, one
colour) and a rewritten `/herramientas`. The screen was eleven stacked text
cards — a wall of prose you read rather than a set of things you reach for; the
grid puts the whole toolbox on one phone screen, found by shape and colour
before it is read. **The sentences are not deleted**: they move into `sr-only`
text, so a screen reader still hears "Cronómetro de contracciones: medí duración
e intervalo…" and the tile stays a tile. Icons are drawn rather than imported —
an icon font or sprite is another request on a screen that must work offline
from first install, and a borrowed set brings a visual language that is not this
app's. The five icons that lived inline in `app/(app)/page.tsx` moved into the
shared component, so the home grid and the toolbox cannot drift apart. Z1's
video gate is preserved. Covered by `e2e/tools-grid.spec.ts` (3, one asserting
the three-per-row geometry from real bounding boxes rather than from the class
name).
### D2 New tools (map #21)
Kegel (timed exercises), **name picker with Guaraní names**, dental
health, diary, sleep. Name picker is the sharing magnet — build its share
card with E2.
### D3 Food lookup (map #23) — the single most valuable content asset — **M** — ✅ DONE
"¿Puedo comer…?" searchable database with a safe/caution/avoid verdict and
a one-line reason: tereré, mate, carne asada, chorizo, quesú Paraguay,
pescado de río (mercury), mandioca, chipa, yuyos, embutidos, sushi.
Data as validated JSON (G1 schema) so the founder/Gemini can extend it.
**Done when:** search is instant and offline; every entry has a reason and
a reviewer flag; unreviewed entries do not render.

Shipped as `/herramientas/comer` (`app/(app)/herramientas/comer/page.tsx`):
instant client-side search (no API call) over `PUBLISHED_FOOD`
(`lib/seed/food.ts`), which is `lib/seed/food.json`'s 62 entries run through
`FoodEntrySchema` (G1) and then `reviewedOnly()` (`lib/seed/gate.ts`) — the
same gate pattern as `PUBLISHED_*` elsewhere, reused rather than reinvented.
Every entry ships today with `reviewedBy` unset, so `PUBLISHED_FOOD` is
empty and the page shows an honest "no revisado todavía" state; asserted by
`lib/seed/food.test.ts`. Verdicts are conservative by construction — mixed
evidence gets `precaucion`, never `safe` — and every reason names the actual
concern and the action to take, not just "consultá a tu médico". Explicitly
precached in `app/sw.ts` alongside the weeks/guías so it works fully offline
from first install. Linked from the herramientas grid and the home screen's
tools grid. See DECISIONS.md "D3" for the verdict-conservatism rules and why
there's no API route at all.
### D4 Checklist as its own tab (map #24) + nav IA — **S** ✅ DONE
Promote checklists to the bottom nav. Resolves the open 5-tab question:
proposed **Hoy · Guías · Checklist · Herramientas · Cerca tuyo**, with
Eventos and Beneficios living inside Cerca tuyo.

Shipped as a `BottomNav.tsx` rewrite: the 5 tabs are now `/` (Hoy),
`/guias` (Guías), a mode-aware checklist tab, `/herramientas`, and
`/directorio` (Cerca tuyo). Progreso and Eventos lost their nav slots but
neither route was removed — Progreso stays reachable from the week-detail
page's existing "todas las semanas" link, and Eventos is now a card at the
top of `/directorio` (pattern copied from the existing Guías→Videos card),
ready for Beneficios (E4) to join it the same way once that tab exists. The
Checklist tab is mode-aware (`checklistHref()` in `BottomNav.tsx`, driven by
`useProfile().mode`): `/planeando/checklist` in planeando mode,
`/herramientas/checklist` otherwise — the two are different Dexie-backed
task lists (TTC vs. pregnancy), not one page with a filter, so the nav tab
deep-links to the right one instead of routing through a picker. The
duplicate "Checklists" entry in the `/herramientas` tools list was removed
now that it has its own tab (feature map #24's "promote out of the tools
drawer").
### D5 Directory category banners (map #26) — ✅ DONE
Image banner + count per category ("Sanatorios · 24 lugares"); server-side
filtering and pagination when listings pass ~100.

Shipped as `lib/directoryBanners.ts` (pure) and
`components/DirectoryBanners.tsx`, wired into `/directorio`. Two rules, both
about not lying: a category with no listings **gets no banner** (nine tiles
reading "0 lugares" is the exact opposite of Z1's honest empty state, and with
every listing gated today that is what the naive version would render), and the
count is of what she would see *after* the department and the search — a banner
promising 24 that opens onto three is worse than no number.

Each banner shows `/assets/directorio/<category>.webp` when it exists and a
pastel block when it does not, the same fallback-on-error pattern as the week
hero. That is what lets "image banner" ship before licensed photography exists:
deliberate today, lights up on its own when G4 drops the files in, nothing
invented in between.

**The second half of the line above is deliberately not built.** Server-side
filtering and pagination would re-introduce exactly the query parameters J3
removed so the Play listing can keep saying "No data collected" — and the
single cached response is what makes the directory work offline. Paging is
client-side instead (10 per category, "ver más"), which is honest at 100
listings and stays honest at 500 because the route already returns everything.
`H3` is where "directory at scale" lives if that ever stops being true.
Covered by `lib/directoryBanners.test.ts` (7) and
`e2e/directory-banners.spec.ts` (1).
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

### E1 Family sharing (map #13 server half) — **L** ✅ DONE
Invite by link/code → `pregnancy_members` with role; partner and family
get a read-only companion view that **never** shows journal notes or
photos. Replaces v2's export-code workaround (P3.2).
**Done when:** an invited partner sees the week, due date and next
appointment and nothing else; revoking access is immediate.

Shipped as `lib/sharing/{fields,client}.ts`, `lib/server/sharing.ts`,
`/api/v1/sharing` and `/familia`. Migration `drizzle/0004_*.sql` adds
`companionSnapshots`. **Read DECISIONS.md "E1" for the role/field contract.**
The design decision worth reviewing: "nothing else" is enforced as a *shape*,
not a filter. A companion cannot read the owner's records at all — they read a
snapshot table holding week, due date, next control and baby name, published by
the owner's device, and that table IS the whitelist. "Show everything except
notes and photos" fails open the first time somebody adds a field; a missing
column cannot. `FORBIDDEN_COMPANION_FIELDS` is asserted against both the
snapshot shape and the schema source. This is a deliberate, bounded exception
to §4.3 (those four fields become server-legible) and is documented as one
rather than buried. Revocation is immediate because `isNull(revokedAt)` is
inside the membership query and the role is never cached anywhere. Invite codes
are single-use — a link forwarded from a WhatsApp group must not let a second
person into somebody's pregnancy. Covered by `lib/sharing/fields.test.ts` (12).
### E2 Share card + bump frame (map #30) — **M** — ✅ DONE
Web Share API from the week hero; canvas-rendered week card and a bump
photo frame. Health details never leave beyond the week number; the photo
is composited **on device**.

Shipped as `lib/share/{card,draw}.ts` and `components/ShareCard.tsx`, mounted
under the home hero (week card) and inside the photo viewer (bump frame).
**The privacy rule is expressed as a whitelist, not as care taken at each call
site**: `ShareCardContent` has exactly three fields — week, wordmark, fixed
tagline — so the due date, the FPP, the department, the sanatorio, the baby's
nickname, weight and symptoms are not merely unused, they are unavailable. A
future "just add the due date, it's cute" is a change to that type, which is
where somebody notices it. Two source-scan tests hold the other half: the
drawing and sharing path contains no `fetch`, no `XMLHttpRequest` and no URL of
ours, and the drawing module mentions none of `SHARE_FORBIDDEN_FIELDS`.

The fallback is the part that will actually run for most users: several
browsers expose `navigator.share` but refuse files, so `canShareFiles` asks
`canShare({files})` rather than sniffing, and hands the PNG over as a download
when the answer is no — a share that silently sends nothing is worse than a
download. The bump photo is read from IndexedDB, drawn with `cover` maths (a
squashed bump photo is the kind of detail that makes somebody not share it) and
never leaves the page. Covered by `lib/share/share.test.ts` (11) and
`e2e/share-card.spec.ts` (2 — the download path, asserting **no non-GET request
of any kind** during the share).
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

### F1 Generation pipeline — **M** ✅ DONE
`POST /api/v1/ai/baby`, **server-side only** (the API key never reaches
the client). Parent photos are sent to the model and **not retained**.
Result stored only if the user saves it. Explicit consent step naming what
is sent and that it is deleted.

Shipped as `lib/ai/babyImage.ts` (pure), `lib/server/aiBaby.ts`,
`/api/v1/ai/baby` and `/herramientas/bebe-ia`. No migration — `aiGenerations`
existed from A1. The three §10 constraints are enforced structurally and two
are asserted **against the source**: the key is read in one server-only module
and sent as a header (never a query string, which lands in access logs), and
`lib/ai/babyImage.ts` — imported by client components — contains no
`process.env` read at all; every `.values({...})` in the server module is
scanned for photo-shaped fields, and the module is asserted to contain no
`console.` at all, since an upstream error can quote a request containing
someone's face. The kill switch fails closed and needs `AI_BABY_ENABLED` to be
exactly `"true"`. The consent step is a gate — the control that sends a photo
does not render until it is ticked, and the server independently requires
`consent: "acepto"`. Saved images go to `photoEntries`, which never syncs: a
generated picture of a baby is as private as a bump photo. Covered by
`lib/ai/babyImage.test.ts` (17). **⚠️ Resolved: F2 shipped, so
`AI_BABY_ENABLED=true` is now safe within the configured ceiling.**

### F2 Quota & cost control — **S** ✅ DONE
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

Shipped as `lib/ai/quota.ts` (pure), the `QuotaStore` interface in
`lib/server/aiBaby.ts`, and `GET /api/v1/ai/baby`. No migration — `quotaMonth`
and `costUsdMicros` were written on every row from F1 for exactly this.
**Two independent limits**: a per-user monthly quota
(`AI_BABY_MONTHLY_QUOTA`, default 3) and a global monthly spend ceiling
(`AI_BABY_MONTHLY_SPEND_CEILING_USD`, default $50) — one person cannot burn the
budget, and a thousand people cannot burn it between two looks at the dashboard.
Both fail **closed**: unset, empty, negative or malformed falls back to the
conservative default, never to "unlimited". The decision reads only the
`aiGenerations` table, so there is no client-supplied number in it to bypass.
The F1 pending row is now also the **reservation**: the order is reserve →
count → refuse-and-release, never count → reserve, so two simultaneous requests
see each other; the failure direction is refusing a request that would have
fitted, never spending money that was not there. In-flight (`pending`) rows
count against the ceiling at the configured price, since a burst that reads a
pre-burst total would sail past it. A refusal **deletes** its reservation —
nothing was sent and nothing was spent, so it must not show up as a failure in
I4's numbers. Covered by `lib/ai/quota.test.ts` (16),
`lib/server/aiBaby.test.ts` (12 — including the two-at-once and in-flight
cases, against an in-memory store, no MySQL), `app/api/v1/ai/baby/route.test.ts`
(4) and `e2e/ai-baby.spec.ts` (2). **`AI_BABY_ENABLED` is now safe to set in
production**, within the ceiling — I4 turns both limits into panel controls.

---

## Phase G — launch readiness

### G1 Content ops (was P2.3) — **M** — do this **before** the content push — ✅ DONE
Move articles, events, videos, directory, placements and the D3 food data
to validated JSON with zod schemas + `npm run validate:content` in CI:
slugs, dates, `+595` formats, department slugs, no placeholder ids, no
module-load timestamps. This is what lets Gemini-generated content and
founder edits land without TypeScript knowledge or code review — it is on
the critical path to launch, not a nicety.
**Done when:** an invalid entry fails CI with a readable message.

Shipped as `lib/content/schemas.ts` (zod schemas + `z.infer` types for
`Article`/`VideoItem`/`EventItem`/`DirectoryListing`/`AdPlacement`/`FoodEntry`,
re-exported from `lib/types.ts` so existing imports were untouched) and
`scripts/validate-content.mts` (`npm run validate:content`, wired into CI right
after lint). Articles and videos moved from typed `.ts` arrays to
`articles.json`/`videos.json`; events moved to `events.json` with **fixed**
epoch-millisecond dates, replacing the old `inDays()` helper that computed
dates from `Date.now()` at module load. Every seed loader (`lib/seed/*.ts`,
`lib/wordpress.ts`) validates at import time too, not just in CI — a bad entry
throws immediately, naming the file, the entry (index + id), the field and a
plain-Spanish reason. Catches: bad slugs, malformed/impossible dates, non-`+595`
phone formats, unknown department slugs, placeholder-token ids
(`todo`/`xxx`/`changeme`/…), duplicate ids, and (via a grep guard) any seed
`.ts` file that still computes a date at module load. The existing `PUBLISHED_*`
gate (`lib/seed/gate.ts`) is unchanged and still runs after validation —
placeholder data validates fine (it's well-formed) and stays hidden. See
DECISIONS.md "G1 — content ops" for the `node --experimental-strip-types`
choice (no new dependency) and the id-vs-placeholder-text distinction.

### G2 Analytics (was P1.3)
Aggregate product metrics off the existing tables + `content_stats`: 
installs, weekly active, retention, tool usage. No per-user behavioural
tracking beyond what the account inherently implies; disclosed in
`/privacidad`.

### G3 Performance & offline budget
The home screen grew a lot in Phase C. Re-check 3G budget, precache only
current ±1 week images, lazy-load the rest, verify Lighthouse.
**Known item from C6:** the home bundle carries the full `articles.json`,
including ~13 kB of article HTML it never renders, because the week filter runs
on the device. Build a client-side article index (slug · title · week range ·
read minutes) and keep the bodies server-side.

### G4 Founder-content integration
Wire in the real directory, videos, events and articles once they exist,
removing the Z1 gates naturally.

---

## Phase I — admin panel & operations

Builds on A7. This is the founder's cockpit: support real users, see what
the business is doing, and control what costs money. It is a product
surface with its own quality bar, not a debug page.

### I1 User support console — **M**
Search and open a user: account state, providers, sign-in history, sync
health (last push/pull, pending records, conflicts), devices, family
members and their roles. Actions: force a resync, revoke a device, revoke
a family membership, run a support-requested deletion, restore a
soft-deleted record within the retention window.
**Still metadata only** (A7 rule): counts and timestamps, never content.
**Done when:** the three real support cases — "no puedo entrar", "perdí
mis datos", "sacá a mi ex del embarazo" — are each resolvable from this
screen without touching the database by hand.

### I2 Business & content stats — **M**
One dashboard, honest numbers:
- **Growth**: installs, sign-ups by provider, local-only vs account users,
  weekly active, W1/W4 retention, mode split (embarazada / planeando).
- **Depth**: users with ≥1 health record, tool usage, weeks reached.
- **Content**: most-read guías, article read-through, the `content_stats`
  counters behind the "popular this week" rail (C7), search terms with no
  result in the food lookup (D3) — that last one is a content backlog
  generator, not a vanity metric.
- **Directory & sponsors**: WhatsApp clicks per listing and per placement
  from `/api/v1/go`, click-through by department and category, dead-link
  reports. This is the number a sponsor will ask for before paying.
**Done when:** every figure is derivable from stored rows (no estimates),
date-ranged, and exportable as CSV so it can go into a sponsor deck.

### I3 Subscriptions & purchases — **M**, blocked on a payment decision
The app is free today, so this ships as the **ledger and the screens
first**, wired to a payment provider later:
- `subscriptions` (user, plan, status, period, source) and `payments`
  (amount in ₲, method, provider ref, status) tables.
- Admin views: active/expired/cancelled, MRR in ₲, churn, failed
  payments, manual grant/revoke of a paid period (needed for bank
  transfers, which will not be automated on day one).
- **Payment reality for Paraguay**: card-first billing works poorly.
  Assume **Tigo Money / Personal / bank transfer**, which means a manual
  reconciliation step is a permanent part of the flow, not a stopgap.
  Design the admin screens around that rather than around a Stripe webhook.
**Done when:** a paid period can be granted, seen by the app, and expire
correctly, with zero payment provider connected.

### I4 AI usage & spend — **S**
Per-user generation counts against quota, global monthly spend against the
ceiling, failures, and the kill switch as a toggle in the panel rather
than a redeploy. Alert when spend crosses a configurable share of the
ceiling.
**Done when:** the founder can answer "what did AI cost me this month" and
stop it in one click.

### I5 Broadcast & ops — **M**
Send a push to a segment (all / by week range / by department), with a
preview, a confirmation step and a per-broadcast audit row. Feature flags
and gates (`PUBLISHED_*`, `AI_BABY_ENABLED`) toggleable from the panel.
**Done when:** a broadcast cannot be sent without an explicit confirm and
is fully audited; a mis-send can be traced to a person.

---

## Phase J — Android / Google Play (new, August 2026)

The distribution target is a Play Store listing, and no phase above accounts
for it. Full playbook in **`docs/ANDROID-LAUNCH.md`**; the code-side work is
small, and most of the schedule risk is in the account type and the forms.

### J1 TWA wrapper — **S**
Package the PWA as a Trusted Web Activity (PWABuilder first, Bubblewrap once it
needs to live in CI). `targetSdkVersion` **36** — required for new apps from
31 August 2026 — and `enableNotifications: true` so B5 push can ever reach an
Android 13+ phone.
**Done when:** a signed `.aab` uploads to internal testing and the installed
app opens with **no URL bar** on a real phone.

### J2 Digital Asset Links — **S**
`public/.well-known/assetlinks.json` carrying **both** the upload key and the
Play App Signing key SHA-256 fingerprints. Listing only the upload key is what
produces the URL bar in J1.
**Done when:** `curl https://<domain>/.well-known/assetlinks.json` returns the
JSON with no redirect, and Google's asset-link checker passes.

### J3 Keep the Data safety answer clean — **S** ✅ DONE
Move directory/placement filtering client-side so `department` stops being
transmitted, and trim `/api/v1/go` attribution to the id. That preserves an
honest **"No data collected"** on the store listing — a visible badge and a
real asset for a pregnancy app. See `docs/ANDROID-LAUNCH.md` §3.1.
**Done when:** no API call carries a location-derived or health-derived
parameter; the whitelist tests are updated to match.

Shipped by giving all three routes an **empty** whitelist rather than a
narrower one: `/api/v1/directory`, `/api/v1/placements` and `/api/v1/go/[id]`
now accept no query parameters and reject (not ignore) anything sent, so a
stale client fails loudly instead of transmitting while the listing claims
nothing is collected. Filtering moved to `lib/directoryFilter.ts`, pure and
unit-tested — `matchesTrimester` keeps the pre-existing `trimester: 0` = "all
trimesters" convention. `category` and `q` were dropped too even though
neither is location- or health-derived: a route that accepts nothing cannot
leak anything, and the single cache key means the service worker's one cached
copy now serves every filter offline. **A real product cost, recorded rather
than hidden:** `week` is gone from the WhatsApp pre-fill, so the business
receives "Vi su información en Mi Bebé" instead of "…(semana 24)" — keeping it
meant sending the user's gestational week to our server on every tap. Covered
by `lib/directoryFilter.test.ts` (11) and a rewritten `app/api/v1/api.test.ts`
(10), which tests both directions: the routes reject every retired parameter,
and a source scan asserts nothing in `app/` or `components/` still builds such
a URL.

### J4 Listing assets — **S** (mostly founder work)
Real 512×512 icon, 1024×500 feature graphic, 5–8 framed screenshots, es-PY
descriptions. `npm run gen:screenshots` is a starting point, not the deliverable.

**Blocked on the founder, not on code:** developer account type (personal vs
organization — a 3–6 week timeline difference, see `ANDROID-LAUNCH.md` §1),
D-U-N-S number, identity verification, and the lawyer-reviewed privacy policy
URL, which must be live before submission.

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
A4 · A5 · **A7** · B1 · B2 · B3 · B5 · C1–C8 · D1 · D4 · E2 · E3.
That is a working, account-backed, synced app with the new home screen,
sharing, and enough admin to support the testers — with demo content still
gated.

**Then, in parallel with the content push:** G1 first (so content can
land), then D2 · D3 · D5 · E1 · E4 · E6 · F1 · F2 · A6 · B4 · D7 · D8 ·
**I1** · **I4**.

**After launch:** G2 · G3 · G4 · **I2** · **I5** · D6 · E5 · Phase H.
**I3** waits on the payment decision and is not on the launch path.

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
