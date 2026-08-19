# Fable review & approved plan — August 2026

> **Updated 2026-08-19:** a second Fable audit (two independent Opus deep
> reviews: technical + product/UX/roles) produced §§5–8 below. The founder
> reviewed the findings and approved the decisions in §5 on 2026-08-19.
> §8 supersedes §4's sequencing for all remaining work.

> **This document supersedes the launch strategy in
> `docs/OPUS-REVIEW-2026-08.md` §4.1 and `docs/MVP-AND-MONETISATION.md` §2
> wherever they conflict.** The founder reviewed 14 recommendations from an
> independent Fable 5 critique on 2026-08-18 and approved all of them.
> The core decision: **the app launches account-first and family-first.**
> "Privacy-first" is no longer the positioning; it survives only as good
> engineering (opaque payloads, deletion guarantees) and as the quiet
> "seguir sin cuenta" fallback.
>
> Read together with `docs/BUILD-PLAN.md` (task detail for everything
> already phased) and `docs/ARCHITECTURE.md` (the data contract, which
> stays in force — amended, not repealed, by K4 and K5 below).

---

## 1. The finding that drives everything

The repo contained two strategies at once:

- The **founder's July 2026 direction**: accounts, sync, family sharing.
  The code followed — A2/A3/A5/A6, E1 (`/familia`), B5 push are built,
  tested and merged.
- The **August 2026 review docs**: a privacy-first launch — v1.0 explicitly
  *excluding* accounts and family, and engineering work (J3, C7) stripping
  data from APIs to preserve a "No data collected" badge on Google Play.

The result today: onboarding still says **"No te pedimos cuenta, ni correo,
ni teléfono"**; sign-in is buried on `/cuenta`; and `/familia` — the invite
feature that is supposed to be the growth engine — is linked from **nowhere**
(not the nav, not the home screen, not onboarding, not ajustes).

The single biggest improvement is not a feature. It is committing to one
direction and wiring the built features into the product's front door.

## 2. Approved decisions (founder, 2026-08-18)

| # | Decision |
|---|---|
| 1 | **Account-first launch.** MVP v1.0 *includes* accounts, sync, family sharing and push. "Seguir sin cuenta" remains available but stops being the headline. Reverses OPUS-REVIEW §4.1. |
| 2 | **Honest Play declarations over the badge.** Give up "No data collected"; declare account data honestly. Keep the opaque-payload architecture (ARCHITECTURE.md §4.3) — it is engineering, not marketing — but the badge no longer vetoes product decisions. |
| 3 | **Fix contradictory copy** — onboarding, README, `/conoce`. |
| 4 | **Sign-in + family invite move into onboarding** (create account → name the baby → invite pareja/familia via WhatsApp). |
| 5 | **`/familia` gets linked** from the home screen and Ajustes ("Tu familia" card). |
| 6 | **Companions get a reason to return**: weekly content addressed to them, a "mandale ánimo" ping to the mamá, shared checklist items assignable to the partner. |
| 7 | **Owner-controlled sharing levels**: the mamá can opt the *partner* (not familia) into weight, kicks, bump photos. |
| 8 | **Opt-in photo sync for account holders** — bump photos and carné photos must survive a lost phone once the story is "sign in and it's all back". |
| 9 | **Start Meta business verification now** (Facebook Login) — longest external lead time; PY is a Facebook/WhatsApp market. Founder task. |
| 10 | **Keep the pull-forwards**: D3 food lookup (done), P6 price guide, F3 symptom insight, F5 deeper onboarding, F6 daily streak — on the launch path. |
| 11 | **New: shared prenatal-appointment agenda** — next control visible to the partner with its own push reminder ("acompañala al control"). Pairs with Ley 7383. |
| 12 | **Post-launch strategic bet: WhatsApp weekly summaries (P7)** — family membership strengthens it (the papá gets the message too). |
| 13 | **Technical housekeeping before launch**: G3 bundle fix, README rewrite, `next-auth` off the beta channel when v5 stable lands. |
| 14 | **Sponsorship-first monetisation confirmed** (MVP-AND-MONETISATION §3.3–3.5 stands). Family accounts strengthen the sponsor pitch: ~3× audience per pregnancy. Nothing safety-critical is ever paid. |

## 3. Phase K — account-first pivot (new work)

Same standing rules as every BUILD-PLAN task: data-contract classification
first, all four gates green, DECISIONS.md entry for anything non-obvious,
es-PY voseo, pastel tokens, offline-and-accountless keeps working (it is a
fallback now, not the pitch — but it must not break).

Tasks are tagged with the **model lane** they are planned for:
**[OPUS]** = architectural / contract-changing / judgment-heavy work.
**[SONNET]** = well-specified wiring, copy and mechanical work executed
after the Opus lane lands.

### K1 Account-first onboarding — **L** [OPUS] ✅ DONE
Rework `components/Onboarding.tsx` into the account-first flow:
mode → role → dates/department → **crear cuenta (Google)** → nombre del
bebé → **invitá a tu pareja y familia** (WhatsApp share of an E1 invite
link). "Seguir sin cuenta" is a visible but secondary link, not a peer
option. Sign-in mid-onboarding must survive the OAuth redirect and resume
the flow where it left off (persist onboarding progress locally before
redirecting). The old "No te pedimos cuenta…" screen is deleted.
**Done when:** a new user can go from first open to a sent invite without
leaving onboarding; abandoning sign-in lands back in a working onboarding,
not a dead end; "seguir sin cuenta" still reaches a fully working app;
e2e covers both paths.
**Status:** done — `claude/k1-onboarding-account-first`. See DECISIONS.md
"K1 — account-first onboarding". The invite step ships with it: an E1 code now
travels as a `/familia?codigo=…` link over WhatsApp.

### K2 Companion experience — **L** [OPUS] ✅ DONE
Today a companion sees week · FPP · próximo control · nombre and has no
reason to open the app twice. Add, for signed-in `partner`/`family`
members:
- The **weekly perspective content** (C4's "para tu pareja / para la
  familia" bands) as *their* home screen, keyed to the owner's week.
- **"Mandale ánimo"** — a one-tap reaction the mamá sees on her home
  screen. New synced store or server table; contains a fixed emoji/phrase
  id only, never free text (no moderation surface).
- **Shared checklist items**: the owner can mark checklist items as
  "para tu pareja"; the partner sees and checks them.
Extends the E1 snapshot contract deliberately — new fields go through the
same whitelist-by-shape mechanism (`companionSnapshots` / a sibling
table), documented as a bounded §4.3 exception like E1 was.
**Done when:** a partner who accepts an invite sees a real home screen
(week hero + para-tu-pareja content + shared checklist + ánimo button);
the mamá sees received ánimos; family role sees content but not the
checklist assignments; revocation still cuts everything instantly.
**Status:** done — `claude/k2-companion`. See DECISIONS.md "K2 — the companion
experience". Two new tables (`companionTasks`, `companionCheers`), both
id-only and both in A5's `TABLE_DISPOSITION`; the companion view is fetched
and never cached, which is what keeps revocation instant.

### K3 Sharing levels — **M** [OPUS] ✅ DONE
Owner opt-in toggles in `/familia`: share **peso**, **pataditas**,
**fotos de la panza** with the *partner role only*. Each toggle publishes
that data into the snapshot mechanism (shape-whitelisted, per-field);
default is all off; journal notes stay unshareable, period.
**Done when:** each toggle is independently on/off; turning one off
removes the data from the partner view on next sync; a field not in the
whitelist shape cannot leak by construction; tests assert the
partner-only restriction (familia never sees these).
**Status:** done — `claude/k3-sharing-levels`. See DECISIONS.md "K3 — sharing
levels". `peso` and `pataditas` carry data today; `fotos` records and enforces
the preference, and K4 is what will have anything to publish under it.

### K4 Photo backup & restore — **L** [OPUS] ✅ DONE
Amends ARCHITECTURE.md §4.4 ("photos never leave the device") into an
**explicit opt-in**: bump photos + carné photos upload for account
holders who turn it on. Design constraints:
- Storage on the same MySQL/Hostinger stack is wrong for blobs at scale —
  decide S3-compatible object storage (or Hostinger object storage) with
  server-issued signed URLs; photos are keyed to the user, never public.
- Photos are **never** rendered in `/admin` and never enter
  `companionSnapshots` unless K3's photo toggle is on.
- Deletion: A5's `TABLE_DISPOSITION` pattern extends to the object store —
  account deletion provably removes blobs.
- Upload is background, chunked, resumable-enough for 3G; sync of
  metadata stays in the existing engine.
**Done when:** opt-in → photos restored on a second device after sign-in;
opt-out stops uploads and deletes server copies; account deletion leaves
zero blobs; the consent copy says exactly what is stored.
**Status:** done — `claude/k4-photo-backup`. See DECISIONS.md "K4 — opt-in
photo backup". ARCHITECTURE.md §4.4 is amended in place. S3-compatible
storage with hand-rolled SigV4 presigning (no SDK); the photo's own metadata
rides an opaque payload rather than becoming a third §4.3 exception.
New env: `PHOTO_STORAGE_ENDPOINT` · `_BUCKET` · `_REGION` · `_ACCESS_KEY` ·
`_SECRET_KEY`. Unset = the feature does not exist, and the app is whole.

### K5 Honest Play data safety — **S** [SONNET]
Rewrite `docs/ANDROID-LAUNCH.md` §3.1's Data-safety answers for the
account-first world (account identifiers + synced health envelope,
declared honestly). Restore the `week` to `/api/v1/stats` (C7's product
cost, no longer justified by the badge) so "popular this week" means the
pregnancy week again — keep the no-user-id, no-IP rule. Do **not** restore
department/week to `/api/v1/go` or directory — those stay clean because
the offline single-cache-key design is better anyway.
**Done when:** the docs describe the true data flows; stats accepts
`{contentId, week}` with the zod whitelist + tests updated; source-scan
tests amended, not deleted.

### K6 Copy & README truth pass — **S** [SONNET] ✅ DONE
Delete/rewrite every remaining "no account" claim: the onboarding line
(if K1 hasn't already removed it), `README.md` (still describes
privacy-first "Nido" — wrong name, wrong story, wrong feature list),
`/conoce`, and a sweep for "nunca sale de tu teléfono" claims that are now
conditional. The new story: *tu embarazo, tu familia, en una sola app —
hecha para Paraguay*.
**Done when:** `grep -ri "no te pedimos cuenta"` returns nothing; README
describes the real app (accounts, familia, sync, offline); privacy claims
are accurate per ARCHITECTURE.md §4 as amended.
**Status:** done — `claude/k6-copy-truth-pass`. See DECISIONS.md "K6 — copy
& README truth pass".

### K7 "Tu familia" surfaces — **S** [SONNET]
Wire the built feature in: a "Tu familia" card on the home screen
(members + avatars + "invitá" button → `/familia`) and a Familia section
in Ajustes (B4's `SettingsGroup`). Add the invite action to the E2 share
card moment ("¿querés que siga tu embarazo? invitala").
**Done when:** `/familia` is reachable in ≤2 taps from Hoy; the card
renders correctly for owner with 0, 1 and n members and is absent for
signed-out local-only users (they see the invite-a-friend card instead).

### K8 Shared appointment agenda — **M** [OPUS] ✅ DONE
`próximo control` becomes a first-class shared object: the partner sees
it (already in the snapshot) **and can opt into their own push reminder**
— "Acompañala al control el jueves a las 9:00". Builds on B5's
payload-free push design (the reminder sentence is composed on the
companion's device from the snapshot). Add optional time (today it is
date-only) and a "¿quién la acompaña?" marker the mamá sees.
**Done when:** partner toggles the reminder in their own settings; it
fires the day before; the mamá's view shows who's coming; no new
server-legible health data beyond the already-shared next-control field.
**Status:** done — `claude/k8-appointment-agenda`. See DECISIONS.md "K8 — the
shared appointment agenda". The only new column anywhere is
`pregnancyMembers.accompanyingAt`, an RSVP pointing at a timestamp that member
could already read.

### K9 Engagement pull-forwards (F3 · F5 · F6) — **M** [OPUS spec → SONNET build]
- **F3 symptom insight**: on-device pattern lines over existing journal
  data ("tus dolores de cabeza aparecen los días que dormís mal") —
  pure computation, reviewed phrasing, never a diagnosis. [OPUS] ✅ DONE
  — `claude/k9-f3-symptom-insight`; see DECISIONS.md "K9 / F3". Templates in
  `lib/seed/insights.json`, G1-validated, gated on the medical reviewer like
  C5. F5 and F6 remain for the Sonnet lane.
- **F5 onboarding depth**: ¿primer embarazo? · ¿IPS o privado? · ¿trabajás?
  → personalises derechos, checklists, article ordering. [SONNET, after K1]
- **F6 daily streak**: memory + gentle streak on the existing mood
  check-in; celebrate, never guilt-trip. [SONNET]
**Done when:** each has unit tests; F3's sentence templates are in a
reviewable seed file gated on the medical reviewer like C5.

### K10 P6 price guide — **M** [SONNET]
"¿Cuánto cuesta?" — ecografía, parto, cesárea, laboratorio at IPS vs
público vs privado, realistic ₲ ranges, G1-validated JSON, `reviewedOnly`
gate, precached offline. Same pipeline as D3.
**Done when:** the tool renders gated content only; entries carry source
+ date; linked from herramientas + week articles.

### K11 G3 performance budget — **M** [SONNET]
As specced in BUILD-PLAN G3: client-side article index (slug · title ·
range · minutes), bodies stay server-side; precache current ±1 week
images; re-verify Lighthouse + 3G budget after K1/K2/K7 land.
**Done when:** home First Load JS back under ~175 kB; Lighthouse PWA +
perf pass recorded in the PR.

### K12 Founder tasks (no code)
Start **now**, in parallel: Meta business verification for Facebook Login
(longest lead time); the reviewer / lawyer / Play-account / directory /
Guaraní items from MVP-AND-MONETISATION §2.1 all stand unchanged.

### K13 Housekeeping — **S** [SONNET]
`next-auth` to v5 stable when published (verify Drizzle adapter compat);
delete or archive stale claims in `docs/` superseded by this file (add a
banner, don't rewrite history).

## 4. Sequencing

**Lane 1 — Opus (contract/architecture work, in order):**
K1 → K2 → K3 → K8 → K4 → K9(F3).
K1 first because K6/K7 copy and wiring depend on the flow it creates.
K4 last in the lane — it is the only one needing new infrastructure.

**Lane 2 — Sonnet (after Lane 1 merges):**
K6 → K7 → K5 → K9(F5, F6) → K10 → K11 → K13.

Each task is its own `claude/k#-…` branch and PR to `main`, gates green,
DECISIONS.md entry appended. Placeholder/content gates (Z1/G1) unchanged.

**v1.0 cut line (replaces MVP-AND-MONETISATION §2.2 scope):**
everything shipped today + K1, K2, K5, K6, K7, K9, K10, K11 + J1/J2/J4.
K3, K4, K8 ship in v1.0 if ready, v1.1 otherwise — they must not block
the Play submission.

> **§4 is superseded by §8 (2026-08-19) for all work not yet merged.**

---

# Addendum — Fable audit round 2, approved 2026-08-19

Two independent Opus audits (technical; product/UX/roles) ran against the
merged K1–K4/K6/K8/K9-F3 state. Full findings live in the audit session;
what follows is the approved actionable subset. Standing rules unchanged:
data-contract classification first, gates green, DECISIONS.md entries,
es-PY voseo, offline-and-accountless keeps working.

## 5. Approved decisions (founder, 2026-08-19)

| # | Decision |
|---|---|
| D1 | This document is updated **in place** (no V2 doc). |
| D2 | **K14 (security & cache correctness) is first and blocks launch.** The SW cache leak makes K2's "revocation cuts instantly" guarantee false in a built app; the push endpoint is an open SSRF surface. |
| D3 | **Sponsor work deferred to a later batch**, scoped to *reporting only* (K15): `placementClicks` day-bucket counts + `/admin/patrocinios`. No sponsor role, no portal — revisit a read-only sponsor login at ~10 paying sponsors. |
| D4 | **No editor/employee role.** Content stays in git (build-time validation + offline precache is the point). A read-only `/admin/contenido` review-debt page ships in a later batch. Platform roles stay `user \| admin`; a capability module is built only when a second privileged human exists. |
| D5 | **Minimal community ships**, scoped to **curated Q&A** (K20): users submit questions, nothing is public until admin approves and answers, answers grow a public FAQ. No free-text between users, no moderator role. |
| D6 | **Language = L0 + L1** (K19): Guaraní on all safety-critical copy (stacked, always shown), plus a typed dictionary + Ajustes toggle over ~100 core UI strings. Full Guaraní weekly content stays out until institutionally funded. No neutral Spanish, no English UI. |
| D7 | **Postpartum deferred** (K17 is a spec note, not a build task yet). Open product decision recorded: one app vs. a separate baby app on the stores. Technical recommendation: same app (third `AppMode`, data carries over birth day); distribution decision is the founder's, later. |
| D8 | **All remaining work builds in the Opus lane** (single build chat). The Sonnet lane is dissolved. |
| D9 | **CI goes label-gated** (K21): the builder validates lint+tests+build in-session (0 minutes), pushes, applies a `run-ci` label → exactly one CI run per PR gates auto-merge. Playwright browser cached. Founder explicitly approved this workflow change per the budgeted-runner policy. Tasks are batched into ~6–8 PRs to cap total Actions minutes at roughly 40–60 for the whole build. |

## 6. New tasks

### K14 Security & cache correctness — **M** [OPUS] — BLOCKS LAUNCH
The audit's top findings, one PR:
- **SW cache leak:** add `NetworkOnly` matchers *before* `...defaultCache`
  in `app/sw.ts` for `/api/v1/(sync|sharing|photos|auth-status|ai)` and for
  navigations to `/admin|/familia|/cuenta|/ajustes`; purge `apis`/`pages`
  caches on sign-out; add a source-scan test asserting every session-bearing
  route is NetworkOnly (so the next route can't regress it). Add
  `cache: "no-store"` to the fetch in `lib/sharing/client.ts`.
- **Push endpoint hardening** (`app/api/v1/push`): whitelist endpoint hosts
  to real push services (FCM, Mozilla, WNS, APNs web push); add rate
  limiting; change the upsert so an anonymous replay can never null out an
  existing `userId` (`coalesce`).
- **Rate limits** on `/api/v1/sharing` and `/api/v1/photos` (copy the sync
  pattern). Take the **rightmost** `X-Forwarded-For` entry in
  `lib/rateLimit.ts`.
- **Bound the photo confirm payload** with the existing 64 KB `.refine()`
  from `lib/sync/protocol.ts`.
- **Security headers** in `next.config.ts`: `frame-ancestors 'none'`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS; CSP starts Report-Only.
- Make `pregnancies_owner_idx` a `uniqueIndex` (create-race fix).
- Write the missing `lib/server/admin.test.ts` `payload` source scan.
**Done when:** a revoked companion offline gets nothing from cache (e2e);
push POST with a non-push-service URL is rejected; all 12 API routes are
throttled; headers verified; DECISIONS.md notes that K2's "never cached"
claim only became true here.

### K15 Sponsor click reporting — **M** [OPUS] — LATER BATCH (post-launch)
`placementClicks` table (placementId, day bucket, count — **no user
identity**, preserving J3) written by `/api/v1/go/[id]`; a
`/admin/patrocinios` page with impressions/clicks per placement per month.
The Sheets webhook stays as an optional mirror.
**Done when:** the admin can answer "what did placement X get in month Y"
without leaving the app; no per-user rows exist by construction (test).

### K16 Admin metrics — **S** [OPUS]
`/admin/metricas`: onboarding completion by step, invites sent→accepted,
week-2 retention proxy, DAU/WAU, tool usage — all aggregate, derived from
existing tables (`syncRecords`, `invites`, `pregnancyMembers`,
`pushSubscriptions`), no identity. **Pre-launch** — this data cannot be
reconstructed retroactively.

### K17 Postpartum — SPEC NOTE ONLY (deferred)
The app dead-ends at week 42 (`clampWeek`). v-next needs: "¿ya nació?"
prompt from week 38 → `postparto` mode (lactancia, control puerperal,
vacunas PAI, Registro Civil — the existing checklist/derechos engines
generalise), tools re-pointed (peso→bebé, diario, fotos). **Open founder
decision first: same app vs. a separate baby app on Play/App Store.**
Technical recommendation: same app. Also in scope when built: a
**pregnancy-loss path** — a quiet Ajustes option that pauses content and
offers archive or delete, with the right copy. Nothing here blocks v1.0.

### K18 Copy honesty sweep #2 + quick wins — **S** [OPUS]
What K6 missed, plus one-liners: delete "Privada: tus datos quedan en tu
teléfono" from `app/layout.tsx` metadata (it's the WhatsApp-preview
string); make `PrivacyLine` state-aware and true; fix the Diario header
(journal notes DO sync unless PIN-encrypted); fix
`lib/sync/stores.ts`'s stale "photos never leave the device" comment; add
`PHOTO_STORAGE_*` and `PUSH_DISPATCH_SECRET` to `.env.example`; mount
`SyncConflicts` on `/herramientas/diario`; delete the `lib/wordpress.ts`
dead stubs; enforce ≥6-digit PIN or say honestly what a 4-digit PIN
protects against.

### K19 Language: Guaraní L0 + toggle L1 — **M/L** [OPUS]
- **L0:** generalise the existing `textGu` pattern into a
  `{ es, gn? }` shape in `lib/content/schemas.ts`; add Guaraní to
  emergencia, señales de alarma, "cuándo ir ya al hospital", derechos
  headlines. Rendered **stacked, always** on safety surfaces. Native-speaker
  review is a **founder task** and gates shipping the strings (same
  mechanism as the medical reviewer gate).
- **L1:** homegrown typed dictionary (`lib/i18n/dict.ts`, missing key =
  type error; **not** next-intl, **no** locale routes, **no** middleware);
  `locale` field on the Dexie profile (syncs free); toggle in Ajustes
  switching ~100 core navigation/safety strings; locale-parity test in the
  repo's source-scan style; all locales ship in one chunk (~25 KB gz each).
**Done when:** toggle works offline; parity test green; 42-week content
untouched (stays es-PY); `<html lang>` follows the locale.

### K20 Curated Q&A community — **M** [OPUS]
Replaces the Roadmap card's promise with a real, safe surface: signed-in
users submit a question (rate-limited, length-capped); questions are
visible **only to admin** until approved; admin approves + answers in
`/admin`; approved Q&As publish into `/preguntas` (which becomes a living
FAQ, precached like other content). No user-to-user text, no public
unreviewed content, no moderator role.
**Done when:** submit → admin queue → approve → visible in `/preguntas`;
rejected/pending questions never render publicly (test); submitter sees
their question's status; deletion via `TABLE_DISPOSITION`.

### K21 Label-gated CI + batching — **S** [OPUS] — FIRST PR
Per D9, founder-approved workflow change: `ci.yml` PR trigger becomes
label-gated (`pull_request: types: [labeled]`, guarded on
`github.event.label.name == 'run-ci'`); keep the `main` push trigger;
cache the Playwright browser; keep single job, concurrency-cancel,
timeout. Builder protocol: validate lint+`validate:content`+tests+build
(and e2e where feasible) **in-session before pushing**, push once clean,
apply `run-ci`, enable auto-merge on green.

### K13 — split (supersedes §3's K13)
- **K13a (now, S):** Next.js 15.1.6 → current 15.x (published CVEs in the
  cache-poisoning/DoS class; the middleware-bypass CVE does NOT apply —
  this app has no middleware, and that fact is now a documented invariant:
  never add middleware auth); `next lint` → eslint CLI; add Dependabot or
  a monthly audit note.
- **K13b (blocked on upstream):** `next-auth` beta → v5 stable when
  published; verify Drizzle adapter compat.

## 7. Amendments to existing open tasks

- **K7** additionally: delete the "Compartir con tu pareja — Próximamente"
  item (and "Comunidad de mamás", replaced by K20's real link) from
  `components/RoadmapSection.tsx`; guard `/familia` for signed-out users
  (invite buttons currently render and can only fail); link
  `/herramientas/bebe-ia` into the tools grid and `/preguntas` somewhere
  discoverable. A shipped feature linked from nowhere is a bug.
- **K7 scope add (UX):** the home "próximo control" shortcut gets an
  inline date+time editor instead of dumping into `/ajustes`; show
  days-to-go and K8's "¿quién la acompaña?" RSVP.
- **K9-F5** includes splitting `components/Onboarding.tsx` (1,039 lines)
  into per-step components while it's open, and adds a first-screen
  **"Me invitaron / tengo un código"** entry so companions skip the
  LMP/department questions (today a papá is asked for his last period).
- **K9-F6:** first make the home mood check-in actually **record** the
  mood on tap (today it only navigates), then build the streak on it.
- **K11** gets the audit's verified target list: `next/dynamic` for
  `Onboarding` on the home route; build-time article index (slug · title ·
  range · precomputed minutes) so `articles.json` bodies **and zod** stop
  shipping to the browser via `WeekArticleFeed`; dynamic-import the
  below-the-fold home cards; trimester-aware ranking + collapse of the
  ~18-card home stack. 175 kB First Load JS is reachable from these alone.
- **K5** design precision: write `week` on the stats POST (column exists),
  keep GET parameterless and single-cache-key; return top-N per week
  bucket in one payload, client selects. DECISIONS.md entry.
- **New push work folded into K9-F6's PR batch:** a weekly `consejos`
  reminder generator (composed on-device, payload-free like B5) and a
  push when a cheer arrives — the toggles exist today with no sender, and
  cheers currently land silently.

## 8. Sequencing (supersedes §4 for remaining work)

**Single Opus build chat.** Batched PRs, each label-gated (K21), validated
in-session before push, auto-merge on green. Dependency order:

| PR | Contents | Depends on |
|---|---|---|
| PR-1 | K21 (CI) + K13a (Next bump, eslint) | — |
| PR-2 | K14 security & cache — **blocks launch** | PR-1 |
| PR-3 | K7 (as amended) + K18 copy/quick wins | PR-2 (touches same surfaces) |
| PR-4 | K16 metrics + K5 stats | PR-1 |
| PR-5 | K9-F5 + K9-F6 (+ weekly/cheer push) + K10 price guide | PR-3 (onboarding/home) |
| PR-6 | K19 language L0+L1 | PR-3 |
| PR-7 | K20 curated Q&A | PR-4 (admin surface) |
| PR-8 | K11 performance — **last** (measures the final home screen) | PR-3, PR-5, PR-6 |

Estimated Actions cost: ~8 runs ≈ 40–70 minutes total.

**v1.0 cut line (supersedes §4's):** everything merged today + PR-1…PR-5
+ PR-8, plus K5 within PR-4. K19 (language) and K20 (Q&A) ship in v1.0 if
ready, v1.1 otherwise — they must not block the Play submission. K15
(sponsor reporting), K17 (postpartum), `/admin/contenido` (review-debt
page) and K13b are post-launch.

**Founder tasks in parallel (unchanged + new):** Meta verification (K12);
native Guaraní reviewer for K19-L0; the one-app-vs-two decision for K17;
real directory/events/placement data (20% of the nav currently renders
empty states — turn them into sourcing surfaces per K18's empty-state
copy).
