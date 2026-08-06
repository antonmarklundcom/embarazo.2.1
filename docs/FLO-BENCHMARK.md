# Feature map — Flo benchmark → Mi Bebé

> **August 2026.** Companion to `docs/FEATURE-MAP.md` (the Preggers benchmark).
> The founder named the second inspiration app: **Flo** — the largest women's
> health app in the world, and the one his Paraguayan partner actually uses.
>
> That matters more than Preggers. Preggers is a well-built Swedish pregnancy
> tracker. Flo is a ~380M-download product that has been A/B testing engagement
> and monetisation in Latin America for a decade. Where Flo and Preggers agree,
> it is probably right. Where Flo has something Preggers does not, it is usually
> because Flo measured it.
>
> Same rule as the Preggers map: **we take structure and feature ideas. None of
> their visuals, art, copy or data practices.**

## What Flo charges for in 2026 — read this first

Flo moved several things **out of free and into Premium** during 2025–26:
detailed pregnancy development content, the AI Health Assistant, and
personalised health reports. Free retains cycle tracking, basic symptom
logging, the Secret Chats community, and the article library.

That is a monetisation map drawn by a company with far better data than we
have. It says: **people pay for personalised answers and structured guidance;
they do not pay for tracking or for community.** `docs/MVP-AND-MONETISATION.md`
§3 builds on that.

One thing worth noticing: the **health report for the doctor** is a Flo Premium
feature. Mi Bebé already ships it free as `/herramientas/resumen`, tuned to the
Paraguayan control prenatal. That is not a gap — it is a lead.

---

## A. Gaps — Flo has it, we do not, and it is not in the 31 Preggers items

| # | Item | Why it matters here | Verdict |
|---|---|---|---|
| F1 | **Anonymous community** (Flo's "Secret Chats") | The single strongest retention mechanic in the category, and arguably worth *more* in Paraguay than in Sweden: taboo topics (adolescent pregnancy, violence, sex, money) where women often have nobody to ask | **Not v1** — see below |
| F2 | **AI health assistant** ("Ask Flo") | Plausibly the killer feature for this market. Between controles, a Paraguayan mother frequently has no one to ask. Also the highest-risk feature in the app | **v1.1, paid tier anchor** |
| F3 | **Symptom pattern insight** | We log symptoms and say nothing back. Flo turns logs into "your headaches cluster with poor sleep". Pure on-device computation over data we already collect | **Cheap, high value — pull forward** |
| F4 | **Structured courses / programmes** | Multi-day guided tracks ("Preparación para el parto en 10 días") rather than loose articles. Higher perceived value → this is what a paid tier is actually made of | **v1.1** |
| F5 | **Deep onboarding personalisation** | Flo asks a lot and personalises hard. We ask department + last period. Asking *¿primer embarazo? ¿IPS o privado? ¿trabajás?* would personalise derechos, checklists and content — and we already have the content branches | **Cheap — pull forward** |
| F6 | **Daily logging loop / streaks** | Flo's habit is "log something today". Ours is a mood row on the home screen with no reward and no memory | **Cheap — pull forward** |
| F7 | **Partner experience** | Both benchmarks have it; ours is planned as E1. Flo's is thin — this is a place to beat both, given the *acompañante* framing | Planned (E1) |
| F8 | **Cycle prediction quality** | Flo's core competence, built on enormous data. Our `planeando` mode is thin by comparison | **Don't chase it** — not our market |

### On F1 (community) — the honest cost

A user-generated content surface changes what this app *is* on Play: a higher
content rating, a mandatory reporting/blocking system, and a moderation
obligation that never sleeps — in Spanish and Guaraní, on health topics, where
bad advice can hurt someone. That is a full-time job, not a feature.

**Cheap experiment first:** run a moderated WhatsApp group for the first
users. Zero code, real signal on whether community is what they want, and it
doubles as the feedback channel the plan already wants (E3/C8). Build F1 only
if that group turns out to be the reason people stay.

### On F2 (AI assistant) — what it needs before it is safe

This is the feature most worth building and the one most capable of hurting
someone. Non-negotiables if it ships:

- **Grounded in our own reviewed corpus only** — retrieval over the guías and
  week content, never a free-floating model answering from memory.
- **Red-flag interception before generation**: sangrado, dolor de cabeza fuerte,
  visión borrosa, fiebre, no siento al bebé → the answer is `/emergencia` and
  141, not a paragraph of prose. This path must be tested, not hoped for.
- **Never diagnoses, never dispenses medication advice**, always ends at
  "consultá con tu obstetra".
- **Logged and reviewable** by the medical reviewer, so bad answers get found.
- Play's Generative AI policy: **in-app disclosure that content is AI-generated,
  plus in-app reporting/flagging** — the same obligations Phase F triggers.
- Cost ceiling and per-user quota, like Phase F's `ai_generations`.

Free and safe beats paid and reckless. The escalation path is free forever.

---

## B. What neither Flo nor Preggers has — the actual moat

These are the items no global app will ever build, because they make no sense
outside Paraguay. Several are already shipped, which is the strongest thing
about this codebase.

| # | Item | Status |
|---|---|---|
| P1 | **Carné perinatal digital** — photograph the pages, blood type and allergies surfaced in Emergencia | ✅ built |
| P2 | **IPS vs privado logistics** — what to bring, what is covered, what it costs | ✅ built (guías) |
| P3 | **Derechos laborales calculator** — Ley 5508, Ley 7383/2024, leave dates computed from the FPP | ✅ built, needs a lawyer's sign-off |
| P4 | **Guaraní on safety content** | ✅ built for alarm signs, needs a native review |
| P5 | **Emergencia: 141 / 911 in one tap, offline** | ✅ built |
| P6 | **Precios reales en guaraníes** — what an ecografía, a parto, a cesárea actually cost at IPS vs público vs privado | ❌ **not planned — build it** |
| P7 | **WhatsApp-native delivery** — weekly week-summary over WhatsApp | ❌ not planned — strategic option, see below |
| P8 | **Dengue / chikungunya / Zika seasonal alerts**, by department | ❌ partially (one tip) — real safety value |
| P9 | **Calendario PAI** for the baby | Planned (Phase H) |
| P10 | **Adolescent pregnancy track** — non-judgmental, rights-forward, Línea 137 | Planned as articles only |
| P11 | **True offline-first** on expensive data | ✅ built — global apps do not bother |

### P6 — price transparency is the most under-rated item on this list

"¿Cuánto cuesta una ecografía?" is among the most-asked and least-answered
questions in Paraguayan pregnancy, and *no app anywhere* answers it. It is pure
content, works offline, needs no infrastructure, is a permanent SEO magnet, and
is directly monetisable — the sanatorios and ecografía centres who want to
appear next to those numbers are the same businesses the directory is already
selling to. Build it alongside D3 (the food lookup).

### P7 — WhatsApp delivery could be a moat and a channel at once

Paraguayan carriers commonly bundle free or zero-rated WhatsApp. A weekly
message — *"Semana 24: tu bebé ya escucha tu voz…"* with a link — reaches women
who cannot afford data at all, on any phone, with no install. No global app
does this because it is pointless in Sweden.

Real costs before anyone gets excited: it needs the WhatsApp Business Platform
(Meta), which charges per conversation, requires template approval for
proactive messages, and needs opt-in handling. It is a **strategic bet, not a
v1 feature** — but it is the single most Paraguayan idea in this document and
worth a serious look once there are users to send to.

### P8 — Zika is not a hypothetical

Zika in pregnancy is a real teratogenic risk in this region and MSPBS issues
seasonal alerts. A department-aware seasonal warning, in Spanish and Guaraní,
tied to the existing dengue guía, is genuine public-health value that a
translated app will never provide.

---

## C. What Flo has that we should deliberately *not* copy

- **Its data practices.** Flo's history with third-party data sharing is the
  reason "your health data never leaves your phone" is a claim worth making
  loudly here. It is currently true of this app, and it is the one competitive
  advantage that disappears the moment accounts and sync ship — see
  `docs/OPUS-REVIEW-2026-08.md` §4.1. Make the positive claim about ourselves;
  do not run comparisons against a named competitor.
- **Paywalling the pregnancy content itself.** Flo can put week-by-week
  development behind Premium because it is a global product with a broad
  free funnel. Doing that in Paraguay would gut the reason this app exists.
  See the ethical line in `MVP-AND-MONETISATION.md` §3.2.
- **Aggressive onboarding upsell.** A paywall before a pregnant user has seen
  anything of value will not convert in this market; it will uninstall.

---

## D. Recommended additions to the roadmap

Small and worth pulling into the launch window:

- **F3 symptom insight** — on-device, over data we already store.
- **F5 onboarding depth** — three more questions, big personalisation payoff.
- **F6 daily loop** — a streak and a memory on the existing mood check-in.
- **P6 price guide** — ship with D3, same content pipeline.

Deliberately after launch:

- **F2 AI assistant** (v1.1, anchors the paid tier, needs the guardrails above)
- **F4 courses** (v1.1, the other half of the paid tier)
- **P7 WhatsApp delivery** (strategic, needs Meta Business + real cost modelling)
- **F1 community** (only if the WhatsApp-group experiment says yes)
- **P8 seasonal alerts** (needs the push channel from B5)
