# Build queue — September 2026 (final plan, after the Fable review)

This is the executable version of `docs/HANDOFF-2026-09-06.md` §5. It splits
the remaining work into independent, PR-sized units, one prompt file each in
`prompts/`. **Read this file before the handoff where they disagree** — this
one was written second, after reviewing the code the handoff describes.

Method: `phased-autonomous-build` (one PR per unit, model fixed at planning
time, each unit owns its files, cross-cutting edits live in one link pass),
run as two sequential windows — see §6.
Fable appears nowhere below; it is not a build model (fable-cost-guardrail).

---

## 1. What the review changed, and why

Decisions the founder made on 2026-09-06 stand (locked, §2). The queue itself
changes in six places:

1. **A missing dependency: there is no runtime flag store.** Every "flag" in
   the app today is either an env var (`AI_BABY_ENABLED`) or a data-driven
   gate (`publishedOnly()` hides placeholder rows; the video tile is locked
   because `PUBLISHED_VIDEOS` is empty). I4's "pause in one click" and I5's
   "toggle from the panel" both need a table, a server read path, a public
   read route for the client, an audit action and a deletion disposition
   before either panel is one screen of UI. That foundation is **U1** and it
   absorbs I5's flag half entirely — once the store exists, the flag panel
   *is* its admin UI. I4 becomes a genuine S on top of it.
2. **I1 is not S/M admin UI, it touches the sync contract.** "Force a resync"
   cannot be done server-side today (the server never contacts a phone); it
   needs a server epoch the client honours by resetting its pull cursor.
   "Restore a soft-deleted record" must also win the client's last-write-wins
   merge or it silently comes back deleted. "Revoke a device" has no device
   table — devices are push subscriptions, and JWT sessions cannot be revoked
   per device without a session-version column. So I1 is **Opus**, runs after
   U1 (both add Drizzle migrations; parallel migrations collide in
   `drizzle/meta/_journal.json`), and its three actions are defined precisely
   in U6 so the session does not invent semantics.
3. **Recomendados: build the rail, but seed it with curated free resources,
   not with products that do not exist yet.** The reason E4 was dropped —
   "nothing real to show" — applies identically to a rail of future products.
   Real, verifiable public resources (carné perinatal, PAI, IPS turnos, Ley
   7383/2024, `/derechos`) give the rail content on day one; product cards
   join when there is a product. Same card, same WhatsApp CTA, same
   `/api/v1/go` click counting, flagged off until the founder flips it (U3).
4. **D6 needs a data gate for missing images, not a flag.** Exercises whose
   step images are not in `public/assets/ejercicios/` stay hidden by the
   content validator, exactly like placeholder rows, so the code and the text
   can ship before the images and light up when they land (U5). D6 also
   inherits the PR-19 line: general wellness content ships under the
   disclaimer; anything that reads as a clinical instruction for a specific
   condition does not.
5. **The hero image work is two units, not one blocked one.** The code
   (themes, fruit toggle, relative-scale engine, preference storage, LCP
   handling) has no dependency on the 42 renders — it works with the existing
   fallback and lights up per week as files land. Only the asset drop (U10)
   waits on the founder. Starting U7 now removes the hero from the critical
   path of the launch.
6. **Ask Flo stays deferred, but the AI question gets a different answer.**
   See §3.

## 2. Decisions already made — do not re-litigate

From `HANDOFF-2026-09-06.md` §2, unchanged: hero art style (semi-realistic
soft-glow render, side-curled, flat backgrounds for `rembg`); one baby art
style, personalisation lives in background themes; no in-app payment path
alongside or around Play Billing, ever, including on the web build (the
founder's explicit choice — the open-web PWA *could* legally take payments,
and that path was ruled out anyway); sponsorships invoiced outside the app
now, own physical products later; E4 → Recomendados; D6 images + text only;
I5 broadcast half not built; obstetra notes and food-safety verdicts stay
hidden until a real reviewer's name is on them.

Added in this review, with the founder's default assumed where noted:

- **Flag semantics are one-directional for money.** The panel can *pause* the
  AI baby feature; it can never enable something the deployment did not
  configure. `AI_BABY_ENABLED=true` stays the master switch.
- **Hero preferences live on the Dexie `profile` row** (theme, fruit toggle),
  the same way `locale` does: synced with the account, no server column, no
  Dexie version bump. *(Assumed — the handoff said "the same way other
  settings are"; this is the way the most recent setting was stored.)*
- **App name:** keep **Mi Bebé** as the product name, with **Embarazo
  Paraguay** as the descriptor everywhere a title has room for it (manifest
  `name`, OG title, marketing site): "Mi Bebé · Embarazo Paraguay". This is
  what `LAUNCH-CHECKLIST.md` §1.2 already recommends, it matches the domain
  the founder owns, and it avoids a second internal rename. "Embarazo" alone
  also excludes the `planeando` mode that exists and the postpartum mode that
  is planned. U8 centralises the brand string so flipping this later is a
  one-line change, not a sweep. *(Founder decision pending — U8 makes either
  answer cheap.)*
- **Per-unit logs replace per-PR `DECISIONS.md` appends for this batch.**
  Standing rule 7 says append to `DECISIONS.md`; eight parallel PRs appending
  to the same file end is a conflict on every merge. Each unit writes
  `docs/log/<unit>.md`; the link pass (U11) writes one consolidated
  `DECISIONS.md` entry and updates `BUILD-PLAN.md` statuses.

## 3. The monetisation / AI critique, in short

**Deferring payments is right, and not only for Play policy.** There are no
users yet. A paid tier's first job is to be *possible* later without a
migration, and the current schema already leaves room (nothing paid exists,
nothing safety-critical will ever be paid). The one path the founder could be
missing — taking web payments on the PWA and hiding purchase UI inside a
later Play TWA — is legal and common, but it is exactly the "Play-adjacent"
complexity that was ruled out, and it is premature at zero users. The lowest
risk revenue that *is* code-adjacent is already built: sponsor placements
with honest click reporting (`/admin/patrocinios`), and a directory
"destacado" tier (H5) is a data field away. What is missing is a sponsor
one-pager — founder work, not a PR.

**Deferring "Ask Flo" is right.** A conversational health assistant is the
highest-risk feature in the docs, it has an uncapped cost curve, and the app
already has the safe version of it: K20's curated Q&A queue, where a human
publishes every answer. The AI feature worth building now is **AI-drafted
answers inside that queue** (U9): the admin sees a suggested draft in es-PY,
edits it, publishes through the existing audited action. Nothing generated
ever reaches a user unreviewed, it reuses the Gemini key and the
quota/kill-switch pattern, and it directly attacks the open question in
`LAUNCH-CHECKLIST.md` §6.2 ("who answers the queue, how fast"). If Ask Flo is
ever built, this is also its training ground: a corpus of human-approved
answers to real Paraguayan questions.

## 4. Autonomy protocol for this batch

Every prompt in `prompts/` references these; they are the
`phased-autonomous-build` §4 rules adapted to this repo.

1. Work until the unit's exit criteria pass; never ask permission for in-plan
   work. Choose reasonably, record the choice in `docs/log/<unit>.md`, go on.
2. One PR per unit. Branch `unit/<id>` off latest `main`. WIP commits every
   30 minutes are fine. Open the PR the same turn the exit criteria pass.
3. **Gates, all of them, before the PR opens:** `npx tsc --noEmit`,
   `npm run lint`, `npm test`, `npm run validate:content`, `npm run build`,
   and the e2e specs the unit touched or added (`npx playwright test <spec>`).
   Run them in the session — CI is label-gated: push once clean, then apply
   the `run-ci` label; after any follow-up push remove and re-add it.
   Auto-merge is off: merge when green if you can, otherwise end with the PR
   URL and say it is ready.
4. **Owns.** A unit writes only to the paths in its prompt's Owns block, plus
   its own `docs/log/<unit>.md` and new files under paths it owns. Append-only
   exceptions named per prompt (e.g. one line in `ADMIN_ACTIONS`). On a merge
   conflict with `main`: main wins, re-apply your own change, re-run gates.
   Never edit a file outside your Owns block to resolve one.
5. **Stop and ask only** for a missing credential with no graceful fallback,
   or a bad-foundation decision (schema, sync contract, auth, money) where a
   wrong guess forces a rewrite. Asking means: append the question to
   `docs/decisions-needed.md`, commit, push, end the session.
6. Repo standing rules apply unchanged (`BUILD-PLAN.md` "Standing rules"):
   offline and no-account must keep working; `lib/server/*` is server-only;
   placeholder data never renders; new API surface gets an empty or explicit
   zod whitelist and rejects unknown params (J3); new pure logic gets unit
   tests; es-PY voseo; pastel tokens only; admin sees metadata, never
   `syncRecords.payload`; every mutating admin action writes an audit row.
7. Polish cap: one screenshot pass, one e2e run reported, PR body ≤ 25 lines
   written once. No screenshots committed.
8. **Model guardrail:** units run on the model in the table. Nothing in this
   batch runs on Fable. A session that believes it needs more capability
   writes why to `docs/decisions-needed.md` and ends.
9. Unit log format (`docs/log/<unit>.md`): ≤ 12 lines Built, ≤ 8 Decisions,
   ≤ 8 Known issues, one line Verification.
10. Units spawn nothing. A runner window (`prompts/RUN-OPUS.md`, `prompts/RUN-SONNET.md`) drives its units in
    sequence; the founder starts each window by pasting one line.

## 5. The units

| Unit | Was | Model | Size | Depends on | Prompt |
|---|---|---|---|---|---|
| U1 | I5 flag half + the store I4 needs | **Opus** | M | — | `prompts/opus-u1-flags.md` |
| U2 | I4 AI usage & spend panel | Sonnet | S | U1 | `prompts/sonnet-u2-ai-spend.md` |
| U3 | E4 → Recomendados rail | Sonnet | M | U1 | `prompts/sonnet-u3-recomendados.md` |
| U4 | D7 tool depth (5-1-1, kicks nudge) | Sonnet | S | — | `prompts/sonnet-u4-tool-depth.md` |
| U5 | D6 ejercicios, images + text | Sonnet | M | — | `prompts/sonnet-u5-ejercicios.md` |
| U6 | I1 support console gaps | **Opus** | M | U1 (migration order) | `prompts/opus-u6-support-console.md` |
| U7 | Week hero v2 — themes, fruit toggle, relative scale | **Opus** | M/L | — | `prompts/opus-u7-week-hero.md` |
| U8 | Brand constant + manifest title | Sonnet | S | — (founder name decision optional) | `prompts/sonnet-u8-brand.md` |
| U9 | AI-drafted answers in the Q&A queue | Sonnet | M | — | `prompts/sonnet-u9-ai-drafts.md` |
| U10 | Hero + fruit asset drop | Sonnet | S | U7 + founder assets | `prompts/sonnet-u10-hero-assets.md` |
| U11 | Link pass | Sonnet | S | all merged units | `prompts/sonnet-u11-link-pass.md` |

**Why Opus where it says Opus.** U1 creates the contract three other units
build on (flag keys, read paths, fail-closed semantics). U6 changes the sync
protocol and the auth session shape. U7 is the product's face and touches the
service worker, statically generated pages and the LCP element at once. Every
other unit fills an existing shape: a page on an existing admin layout, a
content type on the existing zod + `publishedOnly` pattern, a pure function
beside an existing tool.

## 6. Running order — two windows, sequential

The founder runs two chat windows, one after the other, each driving its
units in sequence with one PR per unit merged green before the next starts.
No Opus unit depends on a Sonnet unit, so the Opus window goes first and the
Sonnet window inherits a finished foundation.

```
Window 1 — OPUS:   paste  Read prompts/RUN-OPUS.md in this repo and execute it.
                   builds U1 → U6 → U7, merges each, stops with a report

Window 2 — SONNET: paste  Read prompts/RUN-SONNET.md in this repo and execute it.
                   builds U4 → U5 → U2 → U3 → U8 → U9 → (U10 if renders exist) → U11
```

`prompts/RUN-OPUS.md` and `prompts/RUN-SONNET.md` are the runner prompts;
each unit prompt ends by handing control back to its runner. A runner keeps a
lean context between units: it re-reads only the next unit's prompt and the
files that prompt lists. U8 and U9 are optional — the Sonnet runner skips
them on a note in `docs/decisions-needed.md`. U10 runs only if the founder's
renders are already in the repo; otherwise it is a later one-unit session.

Rough cost at recent rates: Opus units $15–25 each, Sonnet units $5–10 →
**≈ $100–130 for the whole queue**; wall-clock ≈ 3–4 h for the Opus window
and ≈ 4–5 h for the Sonnet window.

## 7. File ownership map (conflict prevention)

| Path | Owner |
|---|---|
| `lib/server/schema.ts`, `drizzle/**`, `lib/server/account.ts` (`TABLE_DISPOSITION`) | U1 then U6, sequentially |
| `lib/admin/audit.ts` `ADMIN_ACTIONS` | append-only: U1, U6, U9 (one line each) |
| `app/admin/layout.tsx` nav | append-only: U1 (`/admin/flags`), U2 (`/admin/ia`) |
| `app/admin/usuarios/**`, `lib/sync/**`, `lib/server/sync.ts`, `lib/server/auth.ts` | U6 |
| `app/admin/preguntas/**`, `components/admin/AdminQuestionActions.tsx` | U9 |
| `app/(app)/herramientas/contracciones/**`, `.../pataditas/**`, `lib/tools/**` | U4 |
| `app/(app)/herramientas/ejercicios/**`, `app/(app)/herramientas/page.tsx` (one tile) | U5 |
| `components/WeekHeroImage.tsx`, `lib/hero/**`, `lib/seed/comparisons.*`, `app/sw.ts` (one rule), `scripts/optimize-images.mjs` | U7 |
| `components/RecomendadosRail.tsx`, `app/(app)/recomendados/**`, `lib/seed/recomendados.*` | U3 |
| `lib/content/schemas.ts` | append-only: U3, U5, U7 (one schema block each) |
| `lib/server/contentDebt.ts` | append-only: U5, U10 |
| `lib/brand.ts`, `app/manifest.webmanifest`, brand strings in components | U8 |
| `app/(app)/page.tsx`, `app/(app)/ajustes/**`, `app/admin/page.tsx`, `DECISIONS.md`, `BUILD-PLAN.md`, `KNOWN-ISSUES.md` | **U11 only** |

`app/(app)/page.tsx` is the hotspot: U7 changes the hero's props there in a
minimal way (it already mounts `WeekHeroImage`); U3 does **not** mount its
rail on the home screen — U11 does.

## 8. Founder inputs (the only human steps)

| Needed by | Item |
|---|---|
| U10 | The 40 week renders (weeks 3–42; weeks 1–2 have no subject) as transparent PNGs after `rembg`, plus one image per fruit/vegetable in `lib/weeks.ts`' `sizeComparison`, in the same lighting. Get them into the repo on a branch (`public/assets/semanas/src/`, `public/assets/comparaciones/src/`) — U10 runs the optimiser. |
| U5 (to light up) | Step images for the exercises U5 writes, into `public/assets/ejercicios/` — generated from the step text U5 produces, same render vocabulary. |
| U8 | The name decision (default: keep Mi Bebé, add "Embarazo Paraguay" descriptor). |
| U3 (to flip on) | A look at the seeded resources on the deployed `/recomendados` before toggling the flag in `/admin/flags`. |
| U9 (to enable) | `AI_DRAFT_ENABLED=true` in the deployment env; same `GEMINI_API_KEY`. |
| — | Sponsor one-pager using `/admin/patrocinios` numbers; legal entity / RUC for sponsor invoicing if the partner is to be the business owner on paper. |

## 9. Parked, unchanged

Postpartum "Ya nació" (H1), Play Store packaging (Phase J), any paid tier
(I3), Ask Flo as a user-facing assistant, I5's broadcast half, weight-gain
bands (reviewer-gated), share card with the themed hero (backlog note in U7).

## 10. Build log index

> **2026-09-11:** the units still open here (U3, U8, U9, U10, U11) are now
> driven by `prompts/RUN-SONNET-2.md`, which runs them first and then the
> improvement units in `docs/BUILD-QUEUE-2026-09-11.md`. `RUN-SONNET.md` is
> superseded; `RUN-OPUS.md` is finished.


One line per unit as it merges: `U<n> — PR #… — docs/log/u<n>.md`.

- U1 — runtime flag store + `/admin/flags` — PR #86 — `docs/log/u1.md`
- U6 — I1 support console gaps — PR #89 — `docs/log/u6.md`
- U7 — week hero v2: themes, fruit toggle, relative scale — PR #90 — `docs/log/u7.md`
- U4 — D7 tool depth: 5-1-1 hint + kicks nudge — PR #91 — `docs/log/u4.md`
- U5 — D6 "Ejercicios": images + text — PR #92 — `docs/log/u5.md`

