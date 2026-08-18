# Fable review & approved plan — August 2026

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

### K6 Copy & README truth pass — **S** [SONNET]
Delete/rewrite every remaining "no account" claim: the onboarding line
(if K1 hasn't already removed it), `README.md` (still describes
privacy-first "Nido" — wrong name, wrong story, wrong feature list),
`/conoce`, and a sweep for "nunca sale de tu teléfono" claims that are now
conditional. The new story: *tu embarazo, tu familia, en una sola app —
hecha para Paraguay*.
**Done when:** `grep -ri "no te pedimos cuenta"` returns nothing; README
describes the real app (accounts, familia, sync, offline); privacy claims
are accurate per ARCHITECTURE.md §4 as amended.

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
