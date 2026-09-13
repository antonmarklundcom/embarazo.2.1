# Plan — 2026-09-13: finish the queue with Codex, go live on the web

Two plans in one file, because they share a clock. **Part A** is how the
remaining code work gets built (Fable manages, Codex `gpt-6-astra` builds).
**Part B** is the shortest path from `main` to a public URL people can
install, and what the founder does in parallel. Read after
`docs/IMPROVEMENT-REPORT-2026-09-11.md` (the *why* of the W units) and
`docs/BUILD-QUEUE-2026-09-11.md` (their ownership map, which still applies).

## 0. Where `main` is today (measured on `aa38d84`)

| Check | Result |
|---|---|
| `npx tsc --noEmit`, `npm run lint`, `npm run validate:content` | clean |
| `npm test` | 100 files, 1150 tests, green, 12 s |
| `npm run test:db` | 40 tests, green |
| Merged since the 09-11 report | V1 (CSP enforced, #95), V2 (sharing backend tests, #97), V3 (Dexie tests, #98), e2e log fix (#100) |
| Open PRs | #101 U3 Recomendados (branch behind `main`), Dependabot #99 #79 #78 #77 |
| Founder assets | `public/assets/semanas/` and `public/assets/ejercicios/` still empty |
| Launch gate in code | only one: a deletion channel env var (`lib/launchChecks.ts`) |

**Conclusion, unchanged from 08-26 and 09-11:** the code is launchable
today. What stands between the repo and a live URL is a domain, a Hostinger
Node app, nine env values and a smoke test. Everything in Part A improves
the app; nothing in Part A blocks Part B. **Run them in parallel.**

## 1. Decisions already made — do not re-litigate

Everything in `docs/BUILD-QUEUE-2026-09-06.md` §2 and
`docs/BUILD-QUEUE-2026-09-11.md` §1, plus:

- **Worker model changes: Codex replaces the Sonnet window.** The unit
  prompts under `prompts/` stay the spec. Each is wrapped in a Codex
  dispatch file under `prompts/codex/` (this plan §3). Nothing else about
  the units changes: same ownership map, same gates, same one-PR-per-unit.
- **Fable is the manager, in the interactive window only.** Fable writes
  dispatch prompts, audits by running the gates, merges. Fable is never a
  subagent, a Routine or a background run (`fable-cost-guardrail`).
- **v1 ships as a PWA on the open web** (DECISIONS.md PR-19). Play/TWA is
  post-launch. Nothing in this plan waits on Play, Meta, a lawyer or a
  gineco-obstetra.
- **Launch before the hero renders land** if the renders are more than a
  week away. The fallback hero is honest; LCP 3.4 s is a regression to fix
  in week 1, not a reason to hold a launch that has no users yet.
- **Dependabot: take patches and minors in the two grouped PRs (#99, #79)
  as one Codex cheap unit; actions/checkout and setup-node 4→7 (#77, #78)
  are taken together in W1** because W1 edits `ci.yml` anyway.

## 2. Part A — the build queue, Codex edition

### 2.1 Roles

| Role | Who | Does |
|---|---|---|
| Manager | Fable 5.1, Anton's window | picks the unit, fills the dispatch file, runs the gates on the result, merges, writes the report line |
| Worker, normal | Codex `gpt-6-astra`, effort low | every unit not marked otherwise |
| Worker, hard | Codex `gpt-6-astra`, effort high | W5, W4, and any unit that failed twice at normal |
| Worker, cheap | Codex `gpt-5.6-luna`, effort low | D1 (dependabot), U8 if the name is already decided, any rename/typo follow-up |

Tier rules, escalation, resume-with-the-exact-error and the report shape
are the `manager-worker-codex` skill's; they are not restated here.

### 2.2 The units, in running order

Order is by value to the launch, then by dependency. One PR each, merged
before the next dispatch. `Files` = the ownership map in
`docs/BUILD-QUEUE-2026-09-11.md` §5 unless stated.

| # | Unit | Tier | Dispatch file | Why now | Depends on |
|---|---|---|---|---|---|
| 0 | **R0** Codex review pass | hard, **read-only** | `prompts/codex/r0-review.txt` | astra reads the code cold and brings Fable a ranked list; Fable triages into units (§2.6) | — |
| 1 | **U3 merge** | none (Fable) | — | PR #101 exists; merge `main` into `unit/u3`, run gates, `run-ci`, merge | — |
| 2 | **W1** CI fast lane + actions bumps | normal | `prompts/codex/w1.txt` | every later PR gets a signal on push; closes #77 #78 | — |
| 3 | **D1** dependabot minors | cheap | `prompts/codex/d1.txt` | closes #99 #79 with one gated run | W1 |
| 4 | **L1** live smoke script | normal | `prompts/codex/l1.txt` | Part B needs it on deploy day (§4.3) | — |
| 5 | **U8** brand constant | cheap if name decided, else normal | `prompts/codex/u8.txt` | title, manifest, OG before first share | founder name |
| 6 | **U9** AI drafts in Q&A queue | normal | `prompts/codex/u9.txt` | the queue gets users on day 1 | — |
| 7 | **W3** alt text + hero contrast test | normal | `prompts/codex/w3.txt` | small, user-facing | — |
| 8 | **W6** perf budget script | normal | `prompts/codex/w6.txt` | baseline before U10 and W4 | — |
| 9 | **U10** hero assets | normal | `prompts/codex/u10.txt` | the LCP fix; only when renders exist | founder renders |
| 10 | **U11** September link pass | normal | `prompts/codex/u11.txt` | closes the U queue; last editor of home/ajustes before W4 | U3 U8 U9 (U10) |
| 11 | **W5** server backend tests ×4 | hard | `prompts/codex/w5.txt` | copies V2's cut four times | V2 (merged) |
| 12 | **W2** docs index + archive | normal | `prompts/codex/w2.txt` | new sessions stop paying to orient | — |
| 13 | **W4** split home + ajustes | hard | `prompts/codex/w4.txt` | 1887 lines → components; e2e pins before and after | U11, W6 |
| 14 | **W7** improvement link pass | normal | `prompts/codex/w7.txt` | one DECISIONS.md entry, KNOWN-ISSUES, statuses | all above |

New units introduced by this plan:

- **D1 — dependabot minors.** Merge `main` into each of #99 and #79 or
  recreate as one branch `deps/2026-09`; `npm ci`, gates, done. Any bump
  that fails a gate is dropped from the batch and listed in the report, not
  fixed. Cheap tier: the outcome is fully specified.
- **L1 — `scripts/smoke-live.mjs`.** `node scripts/smoke-live.mjs https://<domain>`
  runs, against the *deployed* site, the checks a human would otherwise do
  by hand on deploy day: HTTP 200 on `/`, `/semana/20`, `/herramientas`,
  `/conoce`, `/borrar-cuenta`, `/privacidad`; the enforced
  `Content-Security-Policy` header present and no `Report-Only` header;
  `/manifest.webmanifest` parses and its `name` equals `lib/brand.ts`;
  `/sw.js` served with a JS content type; `/api/v1/directory?department=central&trimester=2`
  returns JSON and `?foo=1` returns 400; `/api/auth/providers` returns
  200 (accounts on) or 404 (local-only), printed either way;
  `/borrar-cuenta` HTML contains the configured support email or WhatsApp.
  Exit non-zero on any failure, print a table. No browser, `fetch` only,
  zero new dependencies. Unit test with a mocked `fetch`.

### 2.3 Manager loop, per unit

```
1. git checkout main && git pull && npm ci
2. Fill prompts/codex/<unit>.txt: it already points at the unit prompt;
   confirm Files to touch against the ownership map, add the branch name.
3. Run each command in the dispatch's command list once on main (they all
   pass today; if one does not, fix that first, not in the unit).
4. Dispatch:  codex-run.ps1 -Repo <path> -Tier <tier> -PromptFile prompts/codex/<unit>.txt
5. Audit: run the gates yourself. git status. Compare to Files to touch.
   Read the worker's Flagged section. Fail → resume with the exact error.
6. Push, open PR "<id> — <name>" (≤ 25 lines), apply run-ci, merge squash
   when green. Add the index line (§7 of the 09-11 file; §5 here for D1/L1).
7. Report line to Anton: unit, PR, Codex session id + model/effort from the
   log, gates run, findings rejected, open items.
```

Gates before any PR: `npx tsc --noEmit`, `npm run lint`, `npm test`,
`npm run test:db`, `npm run validate:content`,
`PHOTO_STORAGE_ENDPOINT=https://bucket.example.test NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py npm run build`,
plus the e2e specs the unit prompt names.

### 2.4 Cost and time

Codex tiers are billed on Anton's Codex plan, not per token here. Manager
time is the cost: budget **~20 minutes of Fable per unit** (fill, dispatch,
audit, merge), **14 units ≈ 5 h of manager time spread over as many
sessions as needed**. Wall-clock for the queue: two to three working days
if one unit runs at a time; U8, W3, W6, W2 and L1 have no dependencies and
can run as separate Codex sessions on separate branches in parallel.

### 2.5 Backlog (not in this queue, on purpose)

- `package.json` `"type": "module"` to silence the `.mts` reparse warning:
  touches every `.mjs`/`.js` in `scripts/`; do it after W2 extends `tsconfig`.
- Next 16 / eslint 10: still blocked on `next-auth` v5 stable. Check once
  per window, do not force.
- Postpartum mode, Ask Flo, Play packaging, paid tier: founder-parked.
- A shared rate-limit store: not a problem on one Hostinger process.

### 2.6 Codex as reviewer, Fable as judge

Anton's rule for this queue: astra does not only build, it also looks for
problems and brings the ideas to Fable. Three places where that happens:

1. **R0, before the first build unit.** `codex-run.ps1 -Sandbox read-only
   -Tier hard -PromptFile prompts\codex\r0-review.txt`. The dispatch asks
   for at most 25 ranked findings in a fixed one-line shape, each with how
   it was verified, and a "Verified clean" list so nothing is re-checked.
   It is told what the 09-11 report and this plan already cover, so it
   does not repeat them. Fable's triage of the result:
   - P0 with a reproduction → a new unit `R0-<n>` at the top of §2.2,
     dispatched at normal (hard if multi-file). Recorded in §5 like any unit.
   - P1 → appended to §2.5 backlog or folded into the closest existing
     unit's dispatch file (one line under Definition of done).
   - P2, unverified, or already decided against → dropped, with one line in
     `docs/log/r0.md` saying why, so the next reviewer does not resurface it.
   - Anything that reopens a §1 decision → dropped, no discussion.
   Fable writes `docs/log/r0.md` (findings accepted, rejected, and the
   verified-clean list) and commits it with the first accepted unit.
2. **Per hard unit, a second pair of eyes.** After W5 and W4 pass Fable's
   gates and before the PR opens, a read-only astra-low dispatch reads the
   branch diff (`git diff main...unit/<id>`) with one question: what in this
   diff changes behaviour that the definition of done did not ask for, and
   what would break it. Ten minutes of worker time; the answer goes into
   Fable's audit, not into the PR.
3. **Every worker report's "Flagged" section is an idea channel.** A worker
   that notices something outside its files says so there (AGENTS.md tells
   it to). Fable moves each such line to §2.5 or to a unit, never ignores it.

What this is not: Codex never decides. It never edits outside its dispatch,
never opens a PR, never merges, never rewrites a plan section. Fable reads
every finding against the code before it becomes work, because a reviewer
that reads source text and cannot run the app produces confident wrong
findings at a steady rate, and the cost of one of those becoming a unit is
higher than the cost of the review.

## 3. Codex dispatch files

`prompts/codex/<unit>.txt` — one per unit, the `manager-worker-codex`
template filled in. Each one (a) names the unit prompt in `prompts/` as the
spec, (b) restates Files to touch from the ownership map, (c) lists the
gates verbatim, (d) forbids `DECISIONS.md`, `docs/BUILD-PLAN.md` and
`KNOWN-ISSUES.md` for every unit except U11 and W7. `AGENTS.md` at the repo
root carries the worker-side rules Codex reads on every run. No double
quotes anywhere in these files: the Windows wrapper breaks on them.

## 4. Part B — go live ASAP

Target: **a public HTTPS URL, installable, accounts on, within 3 working
days of Anton starting §4.1.** Nothing below needs a code change; L1 is the
only unit Part B wants from Part A and it can be replaced by a manual check.

### 4.1 Day 0 — the founder's hour (nothing else can start before this)

| # | Item | Where it goes | Notes |
|---|---|---|---|
| B1 | **Domain + subdomain** for the app, e.g. `app.<domain>.com.py` | Hostinger DNS | `embarazo.com.py` is the content site (`docs/SITE-PLAN-EMBARAZO-COM-PY.md`); the app is a subdomain or its own domain. Decide, don't deliberate: a subdomain is one DNS record. |
| B2 | **Monitored support email** | `NEXT_PUBLIC_SUPPORT_EMAIL` | The one hard build gate. Whoever reads it acts only on requests from the account's own email. |
| B3 | **Business WhatsApp** | `NEXT_PUBLIC_BUSINESS_WHATSAPP` | `+595…`; header SOS fallback and the deletion page's second channel. |
| B4 | **App name** | `docs/decisions-needed.md` one line | U8 defaults to `Mi Bebé · Embarazo Paraguay`. Say yes or give the name. |
| B5 | **Hostinger slot** | hPanel → Node.js app | Which account/plan; per `nextjs-deploy-hostinger` pick a slot with Node 22 and Remote MySQL. |

### 4.2 Day 0–1 — the deploy (Anton at the keyboard, Fable in a window for the runbook)

Follow `nextjs-deploy-hostinger` for every step; the app-specific facts:

1. **Create the Node.js app** from the GitHub repo, branch `main`, preset
   Next.js, root `./`, Node **22**, build `npm run build`, start `npm start`.
2. **MySQL.** Create the database in the same Hostinger account. Enable
   Remote MySQL for the app host if the DB is on a different server. Put
   `DATABASE_URL=mysql://user:pass@host:3306/db` in the app's env panel.
   Run `npm run db:migrate` **once** from a machine that can reach the DB
   (Remote MySQL whitelist your IP; the `drizzle/` folder holds the
   migrations). Verify with `db:studio` or a `SHOW TABLES`.
3. **Env vars, minimum set** (values never in git; the panel only):
   `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`,
   `NEXT_PUBLIC_BUSINESS_WHATSAPP`, `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`), `AUTH_URL` (= the app URL),
   `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS` (Anton's Google
   email). Leave Facebook, photo storage, AI baby and push **unset** for
   launch day; each degrades to absent by design (`.env.example`).
4. **Google OAuth client**: origins and redirect URI per README
   ("Configurar el cliente OAuth de Google"), production URL only.
5. **Deploy**, watch the build log. The two classic Hostinger failures and
   their fixes are in the deploy skill: `ERR_INVALID_URL`/`ECONNREFUSED`
   (env var not applied → redeploy after saving), and a build that passes
   locally but fails on the host over Node version (pin 22).
6. **Attach the domain** with SSL. Confirm `https://` before any test.

### 4.3 Day 1 — the smoke test (30 minutes, on a real Android phone plus a laptop)

Run `node scripts/smoke-live.mjs https://<url>` (L1) or do the same by hand:

- [ ] `/` loads; DevTools → Application → Manifest shows name and icons;
      Service worker registered; no CSP violations in the console.
- [ ] Airplane mode → `/semana/20`, `/herramientas`, `/emergencia` still open.
- [ ] Onboarding both modes; "seguir sin cuenta" path works end to end.
- [ ] Sign in with Google; sign out; sign in with email + password (PR-20).
- [ ] Log a weight and a kick on phone A, see it on laptop B after sync.
- [ ] `/familia` → invite by WhatsApp link → accept on the laptop in an
      incognito window → the role sees only what was shared.
- [ ] `/borrar-cuenta` shows the real support address.
- [ ] `/admin` reachable with `ADMIN_EMAILS`, 404 for anyone else;
      `/admin/contenido` counts placeholders as expected.
- [ ] Lighthouse mobile on `/` from the phone's network: note LCP, this is
      the field baseline §6.4 of the launch checklist asked for.
- [ ] `/conoce` → "Agregar a la pantalla de inicio" → app opens without
      URL bar.

Anything red here is a P0 unit: dispatch to Codex hard tier with the exact
observation, merge, redeploy, re-run the list. Do not launch around a red
item; do launch with an empty directory.

### 4.4 Day 2–3 — first users, on purpose

- **Soft launch to 10–20 people** via WhatsApp: Anton's own network first.
  The share card and invite flow (E2/E3) are the growth engine and they are
  built; the first 20 users are the test of them.
- **Q&A queue owner named** (LAUNCH-CHECKLIST §6.2). `/admin/preguntas`
  flags 3-day-old items. Someone checks it daily from day 2.
- **Guaraní sheet** (`docs/GUARANI-REVIEW.md`) to a native speaker. It
  ships pending review; the alarm signs are the part to verify first.
- **Uptime**: a free external ping on `/` every 5 minutes with an email
  alert. If the site is down the app is down (ANDROID-LAUNCH §0).

### 4.5 Week 1–2 — the things that make it look finished

| Item | Unblocks | Owner |
|---|---|---|
| 40 hero renders + fruit images into `public/assets/semanas/` | U10, LCP ≤ 2.5 s, the strongest screen in the app | founder, then Codex U10 |
| Exercise step images into `public/assets/ejercicios/` | U5 lights up | founder |
| 15 real, consented directory entries (Asunción + Central) | `/directorio` stops looking empty | founder calls |
| Two or three real events | `/eventos` | founder |
| Real YouTube ids for six videos | "Pronto" badge disappears | founder |
| Push: VAPID keys + `PUSH_DISPATCH_SECRET` + a cron hitting `/api/v1/push/dispatch` | control-prenatal reminders | Anton, 20 minutes, after users exist |
| Photo backup bucket (S3-compatible, private) | the Ajustes toggle appears | optional, week 2+ |

### 4.6 Post-launch, when there is traffic

Play Store / TWA (`docs/ANDROID-LAUNCH.md`), Meta business verification,
lawyer pass on `/privacidad` and `/terminos`, a named gineco-obstetra
reviewer, AI baby image (`AI_BABY_ENABLED`). None needs code.

## 5. Build log index for this plan

One line per unit as it merges: `<id> — PR #… — docs/log/<id>.md`.

- (none yet)

## 6. Decisions needed from Anton (answer in `docs/decisions-needed.md`, one line each)

1. App URL: subdomain of the content domain, or its own domain?
2. App name: accept `Mi Bebé · Embarazo Paraguay`, or give the name.
3. Support email address to monitor, and who monitors it.
4. Launch before the hero renders exist: yes (this plan's default) or wait.
5. Who drains the Q&A queue.
