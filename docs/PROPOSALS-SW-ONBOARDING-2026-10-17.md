# Two proposals — 17 October 2026

Status: **proposals only. Nothing here is built.** Each one needs a decision from Anton first.

Numbers come from the local production build of main `21eae55` plus the batch on branch `claude/dbatch-20261017`. They are not live measurements.

---

## Proposal 2 — A faster first service-worker install

### The problem

A first visit installs the service worker. The install downloads everything in one go:

| What the install fetches today | Count | Size on disk |
|---|---|---|
| JS and CSS chunks | 141 | 2.1 MB |
| Images and other files from `public/` (week, comparison and guide pictures, exercise art, icons) | 666 | 14.7 MB |
| Page documents from `pageRoutes` (16 app pages including Hoy and `/guias`, 42 weeks, 8 guides) | 66 | small |
| **Total** | **about 870 requests** | **about 17 MB** |

Until that finishes, the app has no worker in control. That means:

- Nothing works offline yet.
- Push opt-in has to wait. On a throttled phone the worker took 13.5 s to become ready (NEXT-15 #3).
- One failing entry (a 404) fails the whole install and takes offline mode with it.

### The idea

Split the install in two.

| Tier | What | When |
|---|---|---|
| Core | App shell and chunks, fonts, icons, exercise art, `/offline`, Hoy (`/`), `/emergencia`, `/derechos`, and the tool pages (contracciones, pataditas, carné, síntomas, diario, fotos, peso, checklist, comer, dental) | In the install, as today |
| Warm | The 42 `/semana/N` pages and their pictures, the comparison pictures, `/guias` and the 8 guides, `/preguntas`, `/recomendados` | In the background, after the worker is active |

Rules for the background job:

- Start with her own week and the weeks next to it. Then the rest, in order of distance.
- Two downloads at a time. One failure never stops the others.
- Skip it on Save-Data or a very slow connection. Try again on the next start or when the phone comes back online.
- It writes to its own cache.

### What is guaranteed offline, and when

The promise stays the same. Only the moment changes for the warm tier.

| Content | Offline guarantee | Today | Proposed |
|---|---|---|---|
| Hoy, emergencia, derechos, all tools | Opens offline, data from the phone | When install ends | When install ends (sooner) |
| Her current week | Opens offline | When install ends | When install ends, because it is warmed first |
| The other 41 weeks and the guides | Open offline | When install ends | When the warm-up ends |

The honest gap: a phone that goes offline in the first minutes after install may not have every week yet. Nothing safety-related is in the warm tier. The README line "Qué funciona offline" should say the weeks are saved in the background after install.

### Files that would change

- `app/sw.ts`: split `pageRoutes` into core and warm lists. Install only the core. Add the warm job, one route for the warm cache (before `defaultCache`), and the copy-forward step below.
- `next.config.ts`: only the Serwist options, so the week and comparison pictures leave the install manifest. For example `exclude` or `globPublicPatterns` in `withSerwistInit`. The headers section stays untouched.
- `lib/invariants/swCache.test.ts` and a new unit test for the two lists.
- `e2e/offline.spec.ts` and `e2e/helpers/offline.ts`: `waitForPrecache` must also wait for the warm cache before the week assertions.
- `README.md`: the offline wording.
- `components/ServiceWorkerRegistration.tsx`: only if the warm job is started from the page. Prefer starting it inside the worker.

### Risks

1. **Cache names must not change.** Installed phones hold `serwist-precache-v2-*`, `mibebe-api`, `mibebe-semanas` and the others. The warm cache is a new name added next to them. Nothing is renamed.
2. **Existing phones would lose their weeks.** Serwist deletes precache entries that the new list no longer has, when the new worker activates. Fix: in the new worker's `install`, copy the week and guide responses from the old precache into the warm cache before activation. This is the riskiest step. It needs an upgrade test: install the old build, load the new one, go offline, open a week.
3. **Two precache controllers must not share one cache.** Each deletes what it does not know. The warm cache needs its own name and its own bookkeeping.
4. **Data cost.** About 13 MB for the warm tier on mobile data. The job must respect Save-Data.
5. **A new worker at deploy time** runs `skipWaiting` and `clientsClaim` as today. No change there.
6. **Not verifiable from here:** real phones, real mobile networks, Hostinger's cache headers for `/sw.js`.

### How to decide

First measure. Install time to `ready` on the same throttled profile, with the core list only. If it does not drop clearly below 13.5 s, stop.

---

## Proposal 10 — Shorter onboarding

### The problem

The mamá walks one screen that is entirely optional: "Contanos un poco más" (`components/onboarding/PerfilStep.tsx`). It asks three things: first pregnancy, where she will be seen, and whether she works. Every answer can be skipped, and most of the benefit shows up days later. It still costs one screen, one tap and a pause before she sees the app.

There is no per-step drop-off data. The funnel records only "onboarded" and later returns (`lib/stats/funnel.client.ts`). Add a counter before judging the effect.

### The idea

Take the screen out of onboarding. Offer the same three questions after she has seen Hoy.

| Option | What | Cost |
|---|---|---|
| A (recommended) | A dismissible card on Hoy, below the hero. One button opens the three questions in place. "Ahora no" hides it for 7 days, then for good. | One new component under `components/home/`, one line in the Hoy page after the redesign lands. |
| B | Only point to Ajustes. "Tu situación" already exists there (`components/ajustes/SituationSettings.tsx`). | No new questions UI. Most people will never look. |

Option A saves answers with the same writer Ajustes uses, so there is one way to store them.

### Step count

Counted from `stepsFor` in `lib/onboarding/progress.ts` for a pregnant mamá, own pregnancy.

| | Today | After |
|---|---|---|
| Signed out | 8 (mode, role, lmp, perfil, department, cuenta, bebe, avisos) | 7 |
| Signed in | 8 (cuenta is skipped, invitar is added) | 7 |
| Papá, other roles, invited, planeando | no perfil step | unchanged |

The "Paso x de y" counter follows `stepsFor`, so it updates by itself.

### What changes in code and tests

- `lib/onboarding/progress.ts`: remove `perfil` from `stepsFor`. Keep it in `ONBOARDING_STEPS` and in the draft parser. A phone that saved a draft at `perfil` must not break: it should land on the next step.
- `components/Onboarding.tsx`: drop the `perfil` render.
- `lib/onboarding/progress.test.ts`: the expected step lists.
- `e2e/helpers/onboarding.ts`: it expects the heading "Contanos un poco más" and clicks "Continuar" when the role is Mamá. That block goes. Every spec that onboards a mamá gets one click shorter.
- `e2e/onboarding.spec.ts`, "the situación answers are optional, stored, and changeable": rewrite to answer the three questions on the Hoy card, then check `/derechos` and Ajustes as it does now.
- New e2e: the card shows, "Ahora no" hides it, and answering stores the values.

### Personalisation effects

| Answer | What it changes | If she never answers |
|---|---|---|
| First pregnancy | Which guides lead the Hoy rail (`WeekArticleFeed`, `PopularThisWeek`) | Default order |
| Where she is seen | Wording of two checklist rows; which column of the price guide opens first | Neutral wording, first column |
| Work situation | `/derechos` opens on her answer instead of asking each visit | It asks each visit, as before K9-F5 |

An unanswered profile behaves exactly like the app before K9-F5 (`isUnanswered` in `lib/onboarding/personalisation.ts`). So skipping is safe. The cost is that the first days are less personal for anyone who dismisses the card.

### Risks

- The Hoy page is being redesigned by another session. Build the card as its own component first. Wire it in after that work lands.
- If the card is easy to ignore, answers drop. Watch the share of mamás with at least one answer after 7 days.
- Nothing in the data model changes: same profile fields, no new Dexie version.
