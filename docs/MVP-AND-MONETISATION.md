# MVP cut line & monetisation

> **August 2026.** Answers two founder questions directly: *what is left before
> I can publish an Android app my partner can actually use and I can put users
> on*, and *how does this make money so I can fund content and paid
> acquisition*.
>
> Read with `docs/OPUS-REVIEW-2026-08.md` (why the plan is re-sequenced),
> `docs/ANDROID-LAUNCH.md` (Play mechanics) and `docs/FLO-BENCHMARK.md`
> (what the paid tier is made of).

---

## 1. The headline: the app is closer than the plan implies

`docs/BUILD-PLAN.md` lists nine phases and dozens of tasks, which reads like a
year of work. It is not the distance to a usable app. **Everything below is
built, tested and passing CI today:**

| Area | Shipped |
|---|---|
| Core | 42 week pages in es-PY with Paraguayan size comparisons · two modes (embarazada / planeando) · onboarding by last period *or* due date · profile editing without data loss |
| Tools | síntomas y ánimo (optional PIN-encrypted notes) · diario de fotos · pataditas · contracciones · peso · checklists · **carné perinatal digital** · **resumen para el control prenatal** |
| Paraguay | **derechos y beneficios** with leave dates computed from the FPP · **emergencia** (141/911, señales de alarma in Spanish + Guaraní, saved contacts) · 8 guías on local logistics · directorio + eventos (gated until real data lands) |
| Planeando | calendario menstrual · días fértiles · checklist preconcepción |
| Platform | offline PWA (42 weeks + guías precached, offline fallback page) · install prompt · update toast · backup/restore · error/404 pages · `/conoce` landing · sitemap/robots/OG · rate-limited API with zod whitelists |
| Quality | 101 unit tests · Playwright e2e · lint · CI runs all of it on every push |

**Your partner could be using this tonight.** It needs a domain and a deploy,
nothing else. Do that before any of the work below — two weeks of one real
pregnant user is worth more than the entire feature backlog, and it costs a
Hostinger deploy.

The one thing that will block a deploy: `NEXT_PUBLIC_MEDICAL_REVIEWER` must be
set or a production build deliberately fails. For a private test with your
partner, set it to the reviewer you are recruiting, or use
`ALLOW_PLACEHOLDER_REVIEWER=1` — **which must never reach a public URL.**

---

## 2. MVP v1.0 — the cut line for Play

**Definition:** an offline pregnancy app for Paraguay, no accounts, no sync,
real local content, on the Play Store. Everything in `BUILD-PLAN.md` Phases
A–F that is not listed here is **after** v1.0.

### 2.1 Founder work — the real critical path

These have external lead times. Nothing in code removes them. Start all five
this week.

| # | Item | Why it blocks | Lead time |
|---|---|---|---|
| 1 | **Gineco-obstetra reviewer** | Production build refuses to compile without one. Also your best distribution channel — their patients are your first users | weeks |
| 2 | **Play developer account: organization vs personal** | Organization skips the 12-testers/14-days gate; needs a D-U-N-S number. Cannot be changed later. `ANDROID-LAUNCH.md` §1 | 1–4 weeks for D-U-N-S |
| 3 | **Lawyer**: privacy policy + terms (Play requires a live URL) and the figures in `lib/derechos.ts` | Placeholder policy = rejected submission | 1–2 weeks |
| 4 | **15–30 real, consented directory listings**, Asunción + Central | The plan says 30–50; 15 real beats 50 invented, and the gate hides the rest automatically | 2–4 weeks of calls |
| 5 | **Native Guaraní review** of `lib/emergency.ts` | Currently drafts, on safety-critical strings | days |

### 2.2 Code work, in order

| # | Task | Size | Why in v1.0 |
|---|---|---|---|
| 1 | **Deploy** — domain, Hostinger, `NEXT_PUBLIC_APP_URL`, staffed WhatsApp number | S | Unblocks everything, including your partner using it |
| 2 | **G1 content ops** — validated JSON + `npm run validate:content` | M | So content lands without touching TypeScript. Do it *before* the content push |
| 3 | **J1–J4 Android** — TWA, assetlinks, listing assets, keep Data safety clean | S each | The actual goal |
| 4 | **D3 food lookup + P6 price guide** | M | The two best content assets in the plan; pure content, offline, uniquely local |
| 5 | **E2 share card + E3 invite** | M | WhatsApp is the distribution channel — build the growth loop before you need it |
| 6 | **F3/F5/F6** (symptom insight, deeper onboarding, daily streak) | S each | Cheap engagement wins from the Flo benchmark |
| 7 | **Analytics** (cookieless aggregate) | S | You cannot reconstruct week-2 retention afterwards |
| 8 | **B5 push, accountless** | M | Biggest retention lever; needs no accounts (`OPUS-REVIEW` §4.2) |

Explicitly **not** in v1.0: accounts, sync, admin panel, AI baby image, AI
assistant, courses, community, family sharing, Beneficios, postpartum mode.

### 2.3 Sequence

1. Deploy → partner uses it → collect what she actually hits
2. Founder items 1–5 running in parallel the whole time
3. Code items 1–3 → Play internal testing (up to 100 testers, no review wait)
4. Friends-and-family round on the internal track — *this doubles as the
   12-tester closed test if the Play account is personal*
5. Code items 4–8 while content lands
6. Submit to production. Budget days-to-weeks for a first review of a health app

---

## 3. Monetisation

### 3.1 The constraint that reorders everything

`BUILD-PLAN.md` I3 assumes a paid tier billed through **Tigo Money / Personal /
bank transfer**, on the reasoning that cards work poorly in Paraguay. That
reasoning is right about the market and wrong about the rules:

> **Anything digital sold inside an app distributed on Google Play must use
> Google Play Billing.** Alternative billing and external-link programs exist,
> but only in eligible countries (US, EEA, Brazil, India, South Korea and a
> few others). **Paraguay is very unlikely to be eligible.** Selling a premium
> unlock for a bank transfer inside the Android app is a policy violation that
> gets the app removed.

Two consequences:

- A subscription must run through **Play Billing**, which in practice means a
  card — exactly the payment method the plan correctly says most Paraguayan
  users do not have. **Verify what Play actually accepts in Paraguay** (card,
  carrier billing via Tigo/Personal, gift cards) in Play Console before
  building anything; I could not confirm carrier-billing availability for PY,
  and it materially changes conversion.
- Therefore **user subscriptions are not the day-one business here.** Something
  else has to be.

### 3.2 The ethical line, stated once

**Nothing safety-critical is ever paid.** Emergencia, señales de alarma, los
derechos, el carné, las 42 semanas, the escalation path in any AI feature —
free forever, for everyone. This is not only ethics: it is what keeps a medical
reviewer willing to attach their name, and it is the difference between a
health app and a health-shaped funnel.

Flo puts pregnancy development content behind Premium. Do not copy that here.

### 3.3 Tier 1 — sponsorship, from day one, no Play involvement

**This is the answer to "how do I fund content and paid acquisition".**

Sanatorios, centros de ecografía, farmacias, tiendas de bebé, pediatras and
prepagas pay **in guaraníes, by invoice, offline** for:

- **"Destacado"** placement in the directory
- **Sponsored category banners** (D5)
- The **Beneficios** tab (E4)
- **Sponsored charlas / eventos** (which are also marketing events for you)
- Placement next to the **price guide** (P6) — the highest-intent surface in
  the whole app

Why this is the right first business:

- **No Google Play involvement at all** — nothing is sold to the user, so
  Play Billing never enters the picture.
- **No card-penetration problem** — businesses pay by transfer or invoice, the
  way they already buy everything else.
- **The rails are already built**: `lib/seed/placements.json`, `SponsoredBadge`,
  `/api/v1/go/[id]` with click attribution, and I2 was designed to produce
  exactly the click report a sponsor asks for before paying.
- **It scales with users**, which is what makes paid acquisition self-funding.

What you need before selling: the legal entity + RUC (already on the founder
list), roughly 200–500 real users so the number is worth quoting, a one-page
rate card, and a monthly click report per sponsor. Price it against what a
Facebook boost costs those businesses locally — do not invent a rate, ask three
of them what they currently spend.

**Declare it honestly on Play:** once sponsored placements are live, the store
listing's ads declaration becomes "contains ads", and sponsored entries must be
labelled in-app. `SponsoredBadge` already exists — use it everywhere.

### 3.4 Tier 2 — "Plan Mamá", v1.1, via Play Billing

Once there are users and the app is stable, a freemium tier built from the
things Flo proved people pay for (`FLO-BENCHMARK.md`):

**Free forever:** everything shipped today, plus the food lookup, price guide,
emergencia, derechos, carné, the 42 weeks, push reminders.

**Paid:** the AI assistant (real per-use cost, natural fit) · structured
courses/programmes · AI baby images beyond a free quota · unlimited photo diary
· PDF export of the resumen · no sponsored content.

Pricing: aim low and test — a monthly in the ₲20.000–30.000 range with a
heavily discounted annual is a starting hypothesis, not a recommendation.
Expect **low single-digit conversion** given card penetration; model it that
way and be pleasantly surprised. Google takes 15% of the first $1M/year.

The `subscriptions` / `payments` ledger in I3 is still worth building — just
wire it to **Play Billing's RTDN webhooks**, not to a manual bank-transfer
reconciliation flow.

### 3.5 Tier 3 — where the real money probably is

- **Sanatorios and prepagas paying per enrolled patient** for a co-branded
  version: fewer missed controles, better-prepared patients, a digital carné.
  B2B contracts in guaraníes, no app-store involvement, far higher ARPU than
  consumer subscriptions in this market.
- **Empresas**: Ley 7383/2024 obliges employers to give paid hours for prenatal
  controls. An HR-facing version that helps them comply and support pregnant
  employees is niche but real, and you already have the legal engine.
- **MSPBS / PAI institutional alignment** — likely not revenue, but distribution
  and credibility that money cannot buy.

### 3.6 What not to do

- **Banner ad networks (AdMob).** CPMs in Paraguay are low, it forces the
  "contains ads" declaration anyway, and ads in a health app cost trust that
  sponsorship does not. Founder decision 4 already ruled out pop-ups — extend
  the same logic to networks. Direct sponsorship pays better per user at this
  size.
- **Paywalling before value.** A paywall in onboarding will uninstall, not
  convert.
- **Selling anything digital in-app outside Play Billing.** See §3.1.

---

## 4. Paid acquisition, when you get there

The sponsorship money funds this. Practical notes for Paraguay:

- **Meta (Facebook + Instagram) is the channel** — this audience lives there,
  and CPMs are cheap. But **you cannot target "pregnant women" as an interest**:
  Meta removed sensitive health targeting. Target women 18–40 in Asunción and
  Central and let the algorithm find them, or use broad parenting/maternity
  interests and lookalikes from your own users.
- **Google Play search is not a channel here.** A new listing in a market this
  size gets close to zero organic store traffic. The listing is credibility and
  a link, not distribution.
- **Your cheapest acquisition is not paid at all**: the medical reviewer's own
  patients, the consultorios you called for directory consent, printed QR codes
  where pregnant women already wait, and WhatsApp shares from the E2/E3 loop.
- Measure cost per *installed and retained* user, not per install. In this
  market an install that never opens twice is easy to buy and worth nothing.
