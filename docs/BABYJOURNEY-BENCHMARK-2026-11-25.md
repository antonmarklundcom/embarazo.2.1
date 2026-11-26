# Baby Journey benchmark for Mi Bebé

Research date: **25 November 2026**. Research and build plan only: no code, schema, deploy or production change was made for this document.

Scope used (Anton was asleep, so the recommended answers to the five scoping questions apply; see "Needs Anton"): pregnancy **and** the baby's first years; visual direction included; no phone screenshots of Baby Journey were available.

**How to read the evidence labels**

| Label | Meaning |
|---|---|
| **[V]** | I (the manager session) opened the page, file or screenshot myself on 25 Nov 2026. |
| **[W]** | A worker read it and I spot-checked the worker's file or extract, but did not open the original. |
| **[NV]** | Not verified. Nobody could confirm it from a public source. |
| **[I]** | Inference or judgement. Mine, not a fact. |

Earlier benchmarks are not repeated here: Preggers ([FEATURE-MAP.md](FEATURE-MAP.md), [PREGGERS-RESEARCH-2026-10-16.md](PREGGERS-RESEARCH-2026-10-16.md)) and Flo ([FLO-BENCHMARK.md](FLO-BENCHMARK.md)). Where this report agrees with them it says so in one line.

---

## 1. One-screen summary

**What Baby Journey is.** A free Swedish pregnancy and parenting app (Baby Journey AB, Stockholm, founded 2020) that follows a family from the positive test to the child's fifth birthday. App Store Sweden: **4.79 from 15,557 ratings**; Google Play: **4.7 from 3.14K reviews, 100K+ downloads** [V]. It is free for users and earns its money from brands: it describes itself as "both an app for young parents and an influencer marketing agency" [V].

**Why users love it** (628 App Store reviews read, 567 of them 4–5 stars [W, spot-checked]):

1. Useful, trustworthy information and articles (about 243 mentions).
2. Following the baby week by week, with a size comparison (about 195).
3. Clear and easy to use (about 117), and it keeps being useful after the birth (about 117).

**What users dislike:** about half of the 61 low-star reviews are about commercial pressure: insurance nagging, push spam, sponsored content mixed with advice [W; my recount found 28 of 61, V].

**The honest picture of Mi Bebé.** The engineering is ahead of Baby Journey in several places (low data use, privacy, partner sharing with server enforcement, kick counter, contraction timer, Paraguay rights and paperwork). The **content and the reasons to come back are far behind**:

| | Baby Journey | Mi Bebé today |
|---|---|---|
| Words on the week-20 page | about 720 (baby 164, mother 373, partner 159) [V] | about 43 unique to the week; about 136 visible with the shared 6-week band text [V] |
| Expert-reviewed content | Named midwife on articles [W]; "written by midwives, child psychologists and pediatric nurses" [V] | `lib/seed/approvals.json` is `[]`: **zero** reviewed items, so 62 foods, 42 "De la obstetra" notes, symptom insights and prices are built but hidden [V] |
| Guides | "Large knowledge bank", 11 topic categories [V] | 8 guides of about 200–390 words [V] |
| After the birth | Weekly then monthly content to age 5, growth curves, vaccination and check-up schedule [V, store text] | One static page for 0–12 months, no schedule, no growth, no milestones [V, screenshot] |
| Daily reason to open | Daily poll ("Parental Temp"), mood tracker that recommends content, personalised feed [V, site and release notes] | A rotating daily tip, counters and a mood row [V] |
| Before she sees anything personal | Account required [W] | Account plus consent required [V] |

**The five things to do first** (full top 10 in section 6):

1. **Remove the dead ends and shorten Hoy.** Tools that open to "todavía no fue revisada" sit in the most prominent shelf; Hoy is more than six phone screens long, with everything at equal weight.
2. **Get a named Paraguayan obstetra to review the content.** One person unlocks four finished features and gives the app the thing Baby Journey's users praise most.
3. **Write real weekly content in three voices** (bebé, vos, tu pareja), unique for every week.
4. **Let her see her week before the sign-in wall**, then ask for the account when there is something to save.
5. **Publish on Google Play.** Paraguay is an Android country and the Play package is already built.

**What not to copy:** the insurance and offer pushes, the gamified levels, the identity-number requirement, the data-hungry personalisation, and the Swedish text left in the Norwegian and Danish apps. Each of those is a top complaint in their own reviews.

**The business lesson in one line.** Baby Journey did not win on features. It won on distribution (a founder with a 20-year audience) plus trust (visible experts) plus a lifetime that runs five years instead of nine months. Mi Bebé needs its own version of each: a local face, a named reviewer, and the baby years.

---

## 2. Why Baby Journey works

### 2.1 Verified facts

| Fact | Source | Label |
|---|---|---|
| Free; "Everything inside is 100% free". No subscription or premium tier found. | <https://babyjourney.io/> | [V] |
| Covers "from the first day of pregnancy to delivery and until the baby is five years old". The age-5 extension was announced 20 April 2025. | <https://babyjourney.io/>, <https://babyjourney.io/press/> | [V] |
| App Store ratings: Sweden 4.79 (15,557), Norway 4.79 (1,496), Denmark 4.76 (404), Finland 4.54 (84). Version 2.61.0, released 19 Nov 2026. | `https://itunes.apple.com/lookup?id=1515225502&country=se` (and `no`, `dk`, `fi`) | [V] |
| Google Play: 4.7, 3.14K reviews, 100K+ downloads, "Contains ads", updated 19 Nov 2026. | <https://play.google.com/store/apps/details?id=se.babyjourney&hl=en&gl=SE> | [V] |
| The app's only listed language is Swedish in all four Nordic App Stores. | iTunes lookup, `languageCodesISO2A` = `SV` | [V] |
| User numbers are company claims that do not agree: 500,000 (home page), 700,000 "across six countries" (press, 29 May 2026), "over 1 million downloads" and "9 of 10 pregnant" (store text). | home, press, App Store description | [V] that the claims are made; the numbers themselves are [NV] |
| Profit "doubled to SEK 4 million" for 2024 (press headline, 28 July 2025). | <https://babyjourney.io/press/> | [V] headline only |
| Founded 2020 by Michaela Forni, Timothy Forni and Damon Foroozesh. Press describes the CEO as an influencer who "has been blogging for 20 years". | <https://babyjourney.io/about-us/>, <https://babyjourney.io/press/> | [V] |
| Business model: app advertising, influencer marketing, podcast advertising, content marketing, PR and sampling, events. "+4,6 million our total reach". | <https://babyjourney.io/for-advertisers/> | [V] |
| An "AI Doula" sends questions to OpenAI and Google Vertex AI; the store text calls it a chat with "legitimerade svar" (licensed answers). The two descriptions conflict. | <https://babyjourney.io/privacy-policy/>, App Store description | [V] both texts; which is true in the app is [NV] |
| Swedish users who register as pregnant give a personal identity number; BankID sign-in exists. | <https://babyjourney.io/privacy-policy/> | [V] |
| The app builds a "persona" from chosen interests and viewed content to tailor content. | <https://babyjourney.io/privacy-policy/> | [V] |

### 2.2 Product map

| Area | What Baby Journey does | Source | Label |
|---|---|---|---|
| Onboarding | Account required (name, e-mail, phone, town). Reviews mention a run of questions about interests and partners. Exact screens and length unknown. | privacy policy; reviews | [W] / [NV] |
| Home | Redesigned Nov 2024; "personalised feed" added late 2025; video moved into the feed Oct 2026. Layout unknown. | App Store version history | [W] / layout [NV] |
| Week by week | Every week has three sections: **Baby, Mother, Partner**. Week 20 on the web is about 720 words. Fruit comparison in the app, length and weight on the web. Countdown to the due date. | <https://babyjourney.io/pregnancy-by-week/pregnancy-week-20/>; store text | [V] |
| "Most appreciated features" (their own list) | Guides, dietary advice, Daily Mood (logs mood and recommends content), **Parental Temp** (a new poll every day; she sees how others in the same week answered), checklists, **Birth Letter** (wishes for the delivery staff), **Birth Story**, Daily Doula, Pre-Parenting Conversations (question cards for couples). | <https://babyjourney.io/app-features/> | [V] |
| Tracking tools | Contraction timer, symptom and body-change log, mood log, weekly belly-photo timeline, parent and baby weight and length curves. **No kick counter and no feeding, sleep or nappy logs** in the listing. | store text; version history | [V] store text / absence [W] |
| Baby stage | Milestones week by week, vaccinations and BVC (Swedish child health centre) visits, weight and length curve, white noise, to age 5. | store text | [V] |
| Community | "Follow other pregnancy journeys". Only 2 of 567 positive reviews mention a forum or community. | home; reviews | [V] / [W] |
| Partner and family | Partner section in every week; a "Team" link between accounts. Complaints: a Norwegian user could not add a partner; "all logging goes to mother"; single parents get partner prompts. | week page; reviews | [V] / [W] |
| Notifications | Not described officially. Reviews: daily insurance pushes, repeated "level" pushes, a rating prompt at every open. | reviews | [W] |
| Formats | Text, video, podcast, checklists, courses for birth preparation, recipes, polls. | home; store text | [V] |
| Who writes it | Midwives, pediatric nurses, pediatricians, child psychologists, dieticians "helped develop and verify the content". One sampled article carried a named midwife as verifier. The week page showed no named reviewer. | about; articles | [V] / [W] |
| Tone | Warm, informal, encouraging; emojis in week pages; the partner is spoken to directly ("The foetus in your partner's abdomen is now…"). | week 20 page | [V] |
| Visual design | Reviewers call it "snygg", "vacker", "mysig" (about 73 of 567). **Colours, illustration style and layouts were not seen.** | reviews | [W] / design itself [NV] |
| Languages | Sites in English, Swedish, Norwegian, Danish, German. App language Swedish only; Norwegian and Danish users report leftover Swedish text. | footer; lookup; reviews | [V] / [W] |
| Release pace | About one release every 1–2 months. The last 12 months added feed, shop, offers, insurance and video; few new tools. | App Store version history | [W]; latest release note [V] |
| Privacy | Health data on consent; data to partners only when the user picks the offer; advertising IDs to Meta, Google and TikTok (iPhone: only with the tracking prompt; Android: on "legitimate interest"); account closed after 24 months idle. | privacy policy | [V] |

### 2.3 What users actually praise (567 reviews rated 4–5)

Counts are keyword matches over the review text, so read them as "roughly" [W; the dump and the live feed match on the rows I checked, V].

| Rank | Theme | About |
|---|---|---|
| 1 | Useful information, tips, articles | 243 |
| 2 | Following the baby's development week by week | 195 |
| 3 | Clear and easy to use | 117 |
| 4 | Still useful after the birth | 117 |
| 5 | Design and a cosy feeling | 73 |
| 6 | Partner and family involvement | 44 |
| 7 | Competitions, offers, discounts | 27 |
| 8 | Checklists | 25 |
| 9 | Feels reassuring | 25 |
| 10 | Fruit comparison, daily question | 13, 10 |

Almost never named in reviews: contraction timer, birth letter, name generator (8 of 567 together), growth curves, belly photos, vaccination schedule, the doula chat, the community.

### 2.4 What users complain about (61 reviews rated 1–3)

| Rank | Theme | About |
|---|---|---|
| 1 | Ads, insurance nagging, spammy pushes, sponsored content mixed with advice | 30 (my recount: 28) |
| 2 | Gamification, rating-prompt nag, pop-ups | 11 |
| 3 | Partner handling; single parents not catered for | 8 |
| 4 | Bugs, resets, lost data | 6 |
| 5 | Identity number required; e-mails after account deletion | 6 |
| 6 | Content aimed at first-time parents only | 5 |
| 7 | Support does not answer | 5 |
| 8 | Unfinished translation (Swedish left in Norway and Denmark) | 1 low-star plus several 4-star mentions |

One Google Play review (April 2025) reports about 10-second waits between screens on Android [V]. The low-star reviews cluster after September 2025, when the release notes turn to offers, shop and insurance [W].

### 2.5 The real answer: why it works [I]

1. **A weekly ritual she looks forward to.** "My baby is a mango this week" plus enough to read that the visit feels worth it. This is the most-cited reason for loving the app, and the cheapest mechanic in the category.
2. **Every week speaks to three people.** Baby, mother, partner. The partner gets a reason to open the app that is not a chore list.
3. **Trust you can see.** Named professions, named verifiers on articles, "recommended by midwives". The top praise is not a feature; it is "good information I can rely on".
4. **A small daily habit.** One poll a day, a mood tap that hands back something to read. Low effort, new every day. Reviews say some users open it daily for this; others find the game layer childish.
5. **It does not end at the birth.** The same app, the same account, five more years. Reviewers who came for the pregnancy stay for the baby.
6. **Free.** No paywall anywhere. The cost is paid in attention, and that is exactly where the complaints come from.

### 2.6 The business behind it [V facts, I reading]

- It is a **media and agency business with an app attached**. The advertiser page sells app advertising, influencer campaigns, podcast ads, content, sampling and events to brands. The press page says "driven by targeted ads aimed at parents-to-be".
- **Distribution came first.** The founder is a long-standing blogger and influencer; the "9 of 10 pregnant women" claim is the company's own, but the Swedish rating count shows real scale.
- **The web site is a funnel.** Free calculators (ovulation, due date, eye colour, height, name generator) and week pages rank in search and each ends with "download the app".
- **iPhone first.** 15,557 App Store ratings in Sweden against 3.14K Play reviews and a 100K+ download bracket. One Android reviewer reports a slow app.
- **Expansion is shallow so far.** Norway, Denmark and Finland get the Swedish app; reviews there mention Swedish text and advice that differs from their own authorities.
- **The commercial layer is now costing goodwill.** Half of the low reviews are about it, and they are recent.

---

## 3. Mi Bebé today, honestly

Evidence is the code on `main` (commit `549705b`) and a local run of the production build at 360×740 with 97 screenshots. Statuses: **LIVE** (reachable, wired, has content), **GATED** (built but hidden behind a review gate, flag or empty data), **HALF**, **PLANNED**, **ABSENT**.

| Area | What exists | Evidence | Status | Where it feels weak |
|---|---|---|---|---|
| Onboarding | Welcome, consent tick, Google sign-in, then 7 screens: mode, date (FUM, ecografía, FIV or conception), situación, departamento, apodo, invitar, avisos. | `components/Onboarding.tsx`, `components/onboarding/*.tsx`, `lib/onboarding/progress.ts` | LIVE | Nothing personal before the account. `lib/auth/access.ts` requires it and deployment builds refuse the no-account mode. In the run, the progress bar said "6 pasos" for 7 screens, "Contanos un poco más" was two screens of choices, and on the last step "Ahora no" sat behind the bottom bar until scrolled [W, run report]. The real sign-in path could not be run locally. |
| Home ("Hoy") | Week hero with ring and realistic render, stories rail, next control, daily tip, weekly line, mood check-in, size tabs, guides for the week, shortcuts, tools, share card, rights card, dengue card, install card. | `app/(app)/page.tsx`, `components/home/*` | LIVE | 4,734 px tall on a 740 px screen: about 6.4 screens [W, run report; full-page screenshot seen, V]. The install prompt appears more than once. Only the tip, the counters and the mood row change from day to day. |
| Week content | 42 weeks; milestone, tip, one line, size comparison, cm and g, foot and hand size, 40 week renders (weeks 3–42). | `lib/weeks.ts`, `lib/seed/weeklyLines.json`, `public/assets/semanas/` | LIVE | About 40–50 words unique to each week [V for week 20]. The vos, pareja and familia text is 7 bands of 6 weeks, so it repeats for six weeks in a row (`lib/seed/perspectives.json` has 7 entries [V]). |
| "De la obstetra" | 42 weekly notes written. | `lib/seed/obstetraNotes.json` | GATED | Never renders: no approvals. |
| Tracking tools | Pataditas, contracciones (5-1-1 detection, WhatsApp share), peso (chart), síntomas y ánimo, sueño, diario (PIN-encrypted), fotos, carné perinatal, preparar mi control, checklist, Kegel, 12 ejercicios, dental, nombres (98, with Guaraní), planeando (ciclo). | `app/(app)/herramientas/*`, `lib/tools/*` | LIVE | Most are bare logs with no feedback. Symptom insights are written but gated. |
| ¿Puedo comer…? | 62 foods with verdicts. | `lib/seed/food.json` [V: 62] | GATED | The tile sits in the first shelf ("Para ahora") and opens to "Esta lista todavía no fue revisada por el equipo médico" [V, screenshot]. |
| ¿Cuánto cuesta? | 4 price bands. | `lib/seed/prices.json` | GATED | Empty state; no source, no review. |
| Videos | 6 rows, all the same placeholder id. | `lib/seed/videos.json` [V] | GATED | Tile shows "Pronto". |
| Baby stage ("Ya nació") | Birth card from week 37; a baby home for 0–12 months with four cards (vacunas, trámites, alimentación y sueño, señales de alarma); monthly push. | `components/baby/*`, `lib/baby/*` | HALF | One static page whatever the baby's age [V, screenshot]. The vaccine card names no vaccine and no age (`VACCINE_LINES` [V]). No milestones, growth, feeding or sleep log. After the birth, `/semana` still shows pregnancy week 38 and the tools grid still offers pataditas and contracciones [W, run report]. |
| Community | None between users. A curated question box exists. | `lib/community/launch.ts`: `COMMUNITY_QUESTIONS_ENABLED = false` [V] | GATED | By design; see FLO-BENCHMARK F1. |
| Partner and family | Roles (owner, partner, family), 6-character WhatsApp invite valid 14 days, a whitelisted snapshot (week, due date, next control, nickname; optional peso, pataditas, fotos), tasks the partner can tick, "mimos" (cheers), a perspective switcher. Enforced on the server. | `lib/sharing/*`, `app/api/v1/sharing/route.ts`, `lib/server/sharing.ts` | LIVE | The structure is stronger than Baby Journey's "Team". The partner's weekly text is the weak part (band text). |
| Notifications | Push categories: recordatorios (day before a control), consejos (weekly "tu semana nueva"), mimos. The server sends an empty poke; the phone writes the words. | `lib/push/*`, `app/sw.ts` | LIVE in code | Real Android delivery was still unconfirmed in the owner manual. The 14-day "¿cómo vas?" nudge is not live (`LAPSE_NUDGE_SERVER_READY = false` [V]). WhatsApp is outbound links only. |
| Guides | 8 guides, about 200–390 words each. | `lib/seed/articles.json` [V: 8] | LIVE | Practical and local, but tiny next to a "knowledge bank". |
| Expert review | Approval and byline system built. | `lib/seed/approvals.json` = `[]`, `lib/seed/reviewers.json` = `[]` [V] | GATED | Zero items reviewed. No byline ever shows. |
| Paraguay content | Derechos calculator (Ley 5508 and others), emergency page (141, 911) public and offline, IPS versus privado, Registro Civil, dengue guide, Guaraní names. | `lib/derechos.ts`, `lib/emergency.ts`, guides | LIVE | The moat. Legal figures not yet lawyer-reviewed. |
| Guaraní | 82 hand-written phrases for alarm signs, emergency, cheers and navigation. | `lib/i18n/dict.ts`, [GUARANI-REVIEW.md](GUARANI-REVIEW.md) | GATED | Behind the `guarani` flag (default off); no native review. Forced on in the run, only the navigation labels and the settings card changed; Hoy, weeks and tools stayed in Spanish [W, run report]. |
| Visual design | Cream, petrol green, terracotta, pastel cards; Nunito Sans; realistic week renders; 22 custom icons. No dark mode. | `app/globals.css` | LIVE | The top of Hoy and the week page look finished [V, screenshots]. Further down, many pastel card colours compete and the page runs long. |
| Free versus paid | No paywall. Sponsor, directory and events surfaces exist but every seed row is a placeholder, so they are hidden. | `lib/seed/gate.ts` | GATED | The week-20 tip tells her to "Mirá el directorio de Mi Bebé", which is empty (`lib/weeks.ts` [V]). |
| Offline and low data | Service worker precaches the app shell, all 42 week pages and 8 guides; week images about 8 KB each. | `app/sw.ts` | LIVE, offline unproven | Low data use is confirmed in the lab: first load of Hoy about 535 KB in 69 requests (largest contentful paint under 1 s on throttled "slow 4G" with a 4× slower CPU); repeat loads served from the service worker with 0 bytes transferred [W, `perf.json` read by me]. **Offline is not confirmed:** with the network cut in the account-less test mode, Hoy and pataditas showed "No pudimos comprobar tu cuenta", and `/semana/24` and `/emergencia` opened in some runs and not in others [W, run report]. A signed-in phone keeps an offline grant that this run could not exercise, and the repo's own offline tests were reported passing on 4 November, so this needs a real-phone check before it is claimed. |
| Install | PWA install works. The Play (TWA) package is prepared. | `android/twa-manifest.json`, [PLAY-STORE-SUBMISSION.md](PLAY-STORE-SUBMISSION.md) | HALF | Not published; blocked on the Play organisation account. |
| Privacy | Device is the source of truth; sync payload opaque to the server; counts-only first-party metrics; export and deletion. | `lib/db.ts`, `lib/server/sync.ts`, `lib/stats/*` | LIVE | A lead, and the opposite of Baby Journey's persona and advertising model. |
| Localisation layer | Spanish is written inside the components; the dictionary has about 40 keys; no country setting. | `lib/i18n/dict.ts` | ABSENT | About 15 modules hold Paraguay facts. A second country is a rewrite today, not a switch. |

Could not be seen from the repo: production flag values, whether the push cron is running now, real usage numbers.

---

## 4. Gap table

Value is for a pregnant woman or new mother in Paraguay. Size: **S** = a few days of build, **M** = one to two weeks, **L** = three weeks or more, or it needs outside people. Sizes are estimates [I].

| # | Feature or quality | Baby Journey | Mi Bebé | Gap | Value | Size | Depends on |
|---|---|---|---|---|---|---|---|
| 1 | Weekly content depth | About 720 words at week 20 in three sections | About 43 unique words; shared band text | Large | High | M | Writer, clinical reviewer |
| 2 | Three voices per week (baby, mother, partner) | Unique partner section every week | Partner and family text repeats for 6 weeks | Large | High | M | Same as 1 |
| 3 | Visible expert review | Named professions; named verifier on articles | System built; zero approvals | Large | High | S code, L people | A Paraguayan obstetra |
| 4 | Food advice | "Dietary advice" listed among top features | 62 foods written, hidden | Built, locked | High | S | Reviewer |
| 5 | Knowledge bank | 11 categories, expert articles, FAQ answered by licensed staff | 8 short guides | Large | High | L | Writer, reviewer |
| 6 | Value before account | Account required | Account and consent required | Same weakness | High | M | Decision on `lib/auth` contract |
| 7 | Dead ends in the app | Not known | Gated tools in the top shelf; tip points to an empty directory; "Pronto" video tile | Quality | High | S | None |
| 8 | Home length and focus | Feed, layout unknown | More than 6 screens; everything at equal weight | Quality | Medium | S–M | Design decision |
| 9 | Daily reason to open | Daily poll with results by week; mood tap that recommends content | Daily tip, counters, mood row | Medium | Medium–High | M | Anonymous counters (exist), enough users |
| 10 | Baby content after birth | Weekly then monthly to age 5 | One static page, 0–12 months | Large | High | L | Writer, reviewer |
| 11 | Vaccine and check-up schedule | Vaccinations and BVC visits "in one place" | No schedule | Large | High | S–M | PAI source (found), reviewer sign-off |
| 12 | Baby growth record | Weight and length curve | Absent | Large | Medium–High | M | Growth standard source [COMPLETAR] |
| 13 | Baby logs (feeding, sleep, nappies) | Absent | Absent | None | Low now | L | — |
| 14 | Kick counter | Not listed | Built, with a baseline nudge | **Mi Bebé ahead** | — | — | — |
| 15 | Contraction timer | Yes | Yes, with 5-1-1 and WhatsApp share | Even or ahead | — | — | — |
| 16 | Birth letter and birth story | Both | Absent; "Preparar mi control" is the nearest | Medium | Medium | M | Reviewer for the questions |
| 17 | Checklists | Per trimester, hospital, baby | Hospital bag, trámites, by IPS, público or privado | Even | — | — | — |
| 18 | Partner sharing | "Team"; users report it breaks; no partner logging | Roles, tasks, cheers, server-enforced privacy | **Mi Bebé ahead** in structure | — | — | — |
| 19 | Single mothers | Complaints about partner prompts | Partner content optional; perfil step exists | Check wording | Medium | S | — |
| 20 | Community | Exists, rarely praised | None | Not worth closing now | Low | L | Moderation |
| 21 | Push notifications | Heavy, top complaint | Light, opt-in | **Mi Bebé ahead** if it stays restrained | — | — | Confirm real delivery |
| 22 | WhatsApp | Not used | Links only | Mi Bebé's opening | High | M | Cost check [COMPLETAR] |
| 23 | Video and podcast | In the feed | None | Do not chase | Low | L | Data cost |
| 24 | Audio | Podcast | None | Opening for Guaraní | Medium | M | Native speaker |
| 25 | Low data and offline | Not claimed | 0-byte repeat loads; offline built but it failed in the local account-less test | **Mi Bebé ahead** on data; offline to be proven | High | S | A signed-in test on a real phone |
| 26 | Speed on Android | One report of 10-second waits | Light lab numbers | **Mi Bebé ahead**; confirm on a real cheap phone | — | S | A test phone |
| 27 | Store presence | Both stores, 4.7–4.8 | PWA only | Large | High | S code | Play organisation account |
| 28 | Privacy | Persona, advertising IDs, identity number | Device-first, counts only | **Mi Bebé ahead** | — | — | Legal review of the texts |
| 29 | Local rights and paperwork | None for other countries | Derechos, Registro Civil, IPS | **Mi Bebé ahead** | — | — | Lawyer review |
| 30 | Second-country readiness | Poor (Swedish text abroad) | Poor (no country layer) | Both weak | Low for PY, high for LATAM | M–L | Do before the content push |
| 31 | Distribution | Founder's audience, web calculators, Instagram | Public week pages, site calculators, QR plan | Large | High | People, not code | A local face |
| 32 | Loss and pause | "Ending a pregnancy" content category | Absent | Medium | Medium | M | Reviewer, careful copy |
| 33 | Night reading | Not known | No dark mode | Small | Low–Medium | S–M | — |

---

## 5. Adapting it for Paraguay, with Latin America in mind

Rule for all of this: **adopt the mechanic, never the material.** No Baby Journey text, image, illustration, name or screen layout is to be copied. Feature names below are ours.

### 5.1 Adaptations

| Mechanic | Paraguay version | What changes for another country |
|---|---|---|
| Three voices per week | "Tu bebé", "Vos", "Tu pareja" (or "Quien te acompaña" when she has said there is no partner), written in Paraguayan Spanish with voseo. Local size comparisons stay (mango, coco, mandioca). Each week ends with one thing to ask at the next control. | The week facts and sizes are universal. Vocabulary and comparisons change (Argentina keeps voseo; Bolivia, Peru and others do not). Keep week text in files tagged by country and language from the first day. |
| Control schedule | Follow the Ministry's own booklet. "Mi Libreta Prenatal" (MSPBS, 3rd edition 2021) says "al menos 4 consultas prenatales": within the first 12 weeks, at 22–26, 27–32 and 36–38 weeks [W, extract checked]. The app can mirror those four moments and "Preparar mi control" can attach to each. Final wording goes through the reviewer. | The number of visits is country data: Argentina's 2023 guideline says at least 8 [W]; WHO recommends 8 contacts [V]. Other countries are leads only [NV]. Store the schedule as data per country. |
| Vaccines in pregnancy | MSPBS (31 July 2025): Tdpa in every pregnancy from the fifth month; influenza once a year in any month [V]. The existing guide covers this. | Country data. |
| Baby vaccine calendar | PAI publishes the "Esquema regular de vacunación 2026" as a poster (ages from newborn to 14 years) [W]. Put it in the app as a dated copy of the official table with the source link, plus a reminder before each age. **The ages are not reproduced in this document**; they go in from the source after the reviewer signs. | Country data: every country has its own calendar. Build the calendar screen once, feed it from a per-country file. |
| Expert voice | "Revisado por" with the obstetra's name and registration, and "De la obstetra" each week. This is Baby Journey's biggest strength and the system for it is already built. | A reviewer per country. The system is the same. |
| Daily question | "Pregunta del día": one anonymous tap, then "así respondieron otras mamás". Uses the existing identity-free counters. With few users, pool by trimester, not by week, and hide results until there are enough answers [COMPLETAR threshold]. | Questions are cultural; write them per country. The mechanism is shared. |
| Mood that gives something back | The mood row already exists. After a tap, offer one short reading or one small action that fits, and the mental-health line when the answer is low. | Help lines are country data. |
| Partner and family | Paraguay's family structure is wider than a couple: add a line each week for "la abuela, la tía, la madrina" in the family voice; keep tasks the partner can tick. Sharing happens by WhatsApp, which already works. | Roles and words change little across the region. |
| WhatsApp as the channel | INE (EPHC 2025): 85.4% of people aged 10+ use the internet, and 97.8% of them use instant messaging "(WhatsApp, Line)" [W, extract checked]. Start with what costs nothing: a weekly card she sends to her family group from the app (exists), and a "mandame mi semana" link. A proactive weekly message needs the WhatsApp Business Platform, with per-message cost and template approval [COMPLETAR cost]. Responde, Anton's own inbox product, may be the cheapest way to run a pilot [I]. | WhatsApp is the main channel across most of the region; the pilot design carries over. Pricing differs per country [COMPLETAR]. |
| Low data and cheap Android | Low data use is already a strength (about 535 KB first load, 0 bytes on repeat visits in the lab). Keep it: no video in the feed, images stay small. Offline reading is built but must be proven on a real phone first (section 3). Add a "descargar para leer sin internet" control for the weeks ahead (already proposed in PRODUCT-NEXT-STEPS #4). StatCounter puts Android at about 81% of mobile web traffic in Paraguay [W, web-traffic based]. | Same across the region. |
| Guaraní and jopara | INE (EPHC 2025): 27.9% of people aged 5+ speak only or mostly Guaraní at home and 38.7% use both languages [V]. Guaraní is mostly a spoken language, so the highest-value step is probably **short audio** of the alarm signs and the weekly line, recorded by a native speaker, before more written Guaraní [I]. The written phrases stay gated until a native review. | Paraguay only. Other countries have their own second languages (Quechua, Aymara). Build audio as "a second language track" so the slot is reusable. |
| Emergency and help lines | 141 and 911 are in the app. The Ministry's booklet also lists 147 (Fono Ayuda) and 137 (SOS Mujer) as free 24-hour lines [W, extract checked]. Consider adding 137 where the app talks about safety at home; the reviewer decides. The MSPBS page for 141 dates from 2015: confirm it is still correct [COMPLETAR]. | Country data. |
| Rights at work | Already built on Ley 5508 (18 weeks of maternity leave is in the law text [V]). | Country data and a lawyer per country. |
| Birth wishes | "Mi plan de parto": a short list of wishes she can show on her phone or send by WhatsApp, with different prompts for hospital público, IPS and sanatorio privado, because what she can ask for differs. Needs the reviewer. | Prompts change with each health system. |
| After the birth | Weekly for the first two months, then monthly: one page per stage with baby, vos (recovery, breastfeeding, mood) and pareja. The Ministry's child booklet ("Libreta de Salud del Niño y la Niña", 2013) is the local reference for controls and growth curves [W; old, check for a newer edition, COMPLETAR]. | Stage content is mostly universal; controls, booklet names and vaccines are country data. |

### 5.2 Where a Nordic feature will not work here

| Baby Journey feature | Why not in Paraguay |
|---|---|
| Identity number and BankID sign-in | No equivalent habit, and it is one of their own 1-star themes. Google sign-in is already a hurdle. |
| Free insurance and in-app insurance sales | Out of scope here, and their largest complaint cluster. |
| In-app shop, discount codes, personalised offers | Out of scope. Also depends on card payments, which earlier docs note work poorly in Paraguay. |
| Video in the feed, podcasts | Mobile data is the constraint. Text, small images and short audio first. |
| "Others in your week" at national scale | Needs a very large user base. Pool by trimester and hide thin results. |
| BVC visit schedule | Sweden's child health centre system. The local equivalents are the PAI calendar and the child booklet's controls. |
| iPhone-first build | Paraguay is mostly Android. Stay web and Android first. |
| Levels, missions, reward pushes | Their reviews show the cost. A quiet streak is enough. |
| Community forum | Barely mentioned in their praise; expensive to moderate. The earlier recommendation (a moderated WhatsApp group as a pilot) still stands. |
| AI doula | Possible later, only with the guardrails already written in FLO-BENCHMARK F2. Their own public texts disagree about whether a human answers. |
| Persona profiling for offers | Conflicts with Mi Bebé's privacy promise, which is an advantage worth keeping. |

### 5.3 Do not build Paraguay-only where regional costs the same

Today the Paraguay facts are spread over about 15 modules and all Spanish is written inside components. Before the content push in section 6:

1. **One country file.** Emergency numbers, care settings (IPS, público, privado), currency, administrative divisions, document names (libreta, carné), laws, control schedule, vaccine calendar, help lines: one module per country, read by the screens.
2. **Content files tagged by country and language** (`es-PY` today). Universal facts (week sizes, development) are shared; local advice is per country.
3. **New text goes into a message catalogue**, not into components. Existing text can move gradually.

The cost of the rule is small now and large later. Baby Journey shows what happens without it: Swedish text in the Norwegian and Danish apps.

---

## 6. Top 10 improvements, ranked by value against effort

| Rank | Improvement | Why (evidence) | Value | Size | Blocked on |
|---|---|---|---|---|---|
| 1 | **Remove dead ends, tighten Hoy** | Gated tools sit in the first shelf; a weekly tip points to an empty directory; Hoy is more than 6 screens; seven sections show "todavía no" messages. Fixing this makes everything already built feel better. | High | S | Nothing |
| 2 | **Named clinical reviewer, bylines on** | Their top praise is trustworthy information. One reviewer unlocks 62 foods, 42 weekly notes, symptom insights and prices that are already written. | High | S code | Anton: find and contract the obstetra |
| 3 | **Weekly content in three voices** | Their second-biggest praise. Week 20: about 720 words there, about 43 here. | High | M | Writer; reviewer (item 2) |
| 4 | **Her week before the sign-in wall** | Both apps demand an account first; theirs gets 1-star reviews for it. Show the week from a date, ask for the account when she wants to save. Public week pages already exist. | High | M | Anton: decision, because it touches the `lib/auth` contract |
| 5 | **Publish on Google Play** | Paraguay is mostly Android; the package is built; a store listing is also where trust and ratings accumulate. | High | S code | Anton: Play organisation account |
| 6 | **Pregunta del día and mood-linked reading** | Gives a new reason to open every day without pushes. The identity-free counters exist. | Medium–High | M | Enough users for results; question list reviewed |
| 7 | **PAI calendar with reminders in baby mode** | "Vaccinations in one place" is a listed strength there; here the card names nothing. The official 2026 schedule is public. | High | S–M | Reviewer sign-off on the copied table |
| 8 | **WhatsApp weekly message pilot** | 97.8% of internet users use messaging. No global app does this. | High | M | Cost and template check [COMPLETAR] |
| 9 | **Baby's first year: stage content and a growth record** | "Still useful after the birth" is a top-four praise, and it multiplies how long a user stays. | High | L | Writer, reviewer, growth-standard source |
| 10 | **Country layer and message catalogue** | Low value for a mother today, high for the Latin America plan; cheap only if it comes before items 3 and 9. | Strategic | M–L | Nothing; start as a rule in phase 1 |

---

## 7. Build order in three phases

Durations are estimates [I]. Nothing here is authorised to build yet; this is the proposed order.

### Phase 1: make what is built count (about weeks 1–4)

- Item 1: hide gated tiles until they have content; fix the copy that points to empty features; restructure Hoy into the hero, "hoy" (three things), and collapsed sections.
- Item 2: start the reviewer search on day one; when the first approvals land, the food lookup and weekly notes switch on without new code.
- Item 4: decide, then build "ver mi semana" before sign-in.
- Item 5: start the Play account paperwork (long lead time).
- Item 10, the rule only: country file and tagged content for anything new.
- Watch five mothers use the app (already proposed in PRODUCT-NEXT-STEPS #19) and read the baseline in `/admin/metricas`.
- Test offline on a real, signed-in Android phone and fix what fails; in baby mode, stop showing pregnancy week 38 and the kick counter.

Done when: no screen in the main paths shows an empty state; at least one reviewed item shows a byline; the funnel numbers are written down.

### Phase 2: give her a reason to come back (about weeks 5–10)

- Item 3: three voices for all 42 weeks, reviewed in batches by trimester.
- Item 6: pregunta del día and the mood follow-up.
- Item 7: PAI calendar and reminders.
- Item 8: WhatsApp pilot with the first users, after the cost check.

Done when: every week page has unique text for bebé, vos and pareja; the weekly return number in `/admin/metricas` has moved against the phase-1 baseline.

### Phase 3: grow with the baby, and beyond Paraguay (about weeks 11–20)

- Item 9: baby stage content for the first year, growth record, the birth in the family snapshot.
- Item 10 in full: move existing text to the catalogue; move the Paraguay facts into the country file.
- "Mi plan de parto" and a birth story page.
- Audio for the alarm signs and weekly line in Spanish and Guaraní.
- Night reading mode; a careful loss and pause flow.
- Then decide on a second country, with one local reviewer and one local partner lined up first.

---

## 8. Visual direction

Baby Journey's own look could not be seen (no screenshots), so this section judges Mi Bebé on its own screens and on what their reviewers say they like: "tidy", "clear", "cosy" [W]. Everything below is my judgement from the 90 screenshots [I].

**Keep**

- The palette: cream, petrol green, terracotta. It is warm and it does not look like the pink-and-blue of the category.
- The week hero: the ring, the realistic render, "23 semanas y 4 días" in large type, cm and g in one pill. It is the best screen in the app.
- The realistic week renders (40 of them, already paid for and approved in October).
- Nunito Sans, the SOS button always in the header, the four-tab bar, the custom tool icons.
- Local size comparisons with a small object photo.

**Change**

| What | Why | Size |
|---|---|---|
| Give Hoy a shape: hero, then "Hoy" with at most three things (today's tip, the daily question, the next control), then sections that open on tap. | More than six screens of scroll; the most useful things are far down, and the install prompt repeats. | M |
| Use card colour for meaning, not variety: one tint each for bebé, vos, pareja and "para hacer"; neutral cards everywhere else. | On one week page there are pink, green, lavender and blue cards with no rule behind them. | S |
| Never show an empty promise in a prime spot. | "¿Puedo comer…?", "¿Cuánto cuesta?", "Así podría ser" and "Videos · Pronto" all sit in the tools grid without content. | S |
| Give baby mode its own hero (age, a monthly image, "this month") in the same language as the pregnancy hero. | After the birth the app turns into a plain information sheet. | M |
| Fewer small-caps labels; one clear title per section. | Many sections open with a spaced uppercase eyebrow, which flattens the hierarchy. | S |
| A night reading mode. | Late-night reading is when a pregnant woman or new mother has the phone in hand; there is no dark theme. | S–M |
| Show the reviewer: a face, a name, a registration number. | Trust is visual too. | S, after item 2 |

Before any larger restyle: get Anton's screenshots of Baby Journey's onboarding and main tabs, so the comparison is with their real screens and not with adjectives from reviews.

---

## 9. Other things that help the app and the business win

1. **Find the local face.** Baby Journey's growth engine was a person with an audience, not a feature. The Paraguayan equivalent is an obstetra, midwife or well-known mother who is the visible voice of the app. If the clinical reviewer is willing to be that person, one hire solves trust and reach together [I].
2. **Make "sin publicidad que moleste, tus datos son tuyos" a promise.** Their weakest point is commercial pressure and data use. Mi Bebé's architecture already supports the opposite claim. Say it on the welcome screen.
3. **If money comes later, keep it in one opt-in place.** Their reviews show the pattern to avoid: offers pushed by notification, benefits tied to taking an offer, sponsored text next to advice.
4. **Work with the public system.** Follow the Ministry's booklet structure, link every schedule to its official source, and offer clinics a QR code (the plan exists in [QR-CLINICS.md](QR-CLINICS.md)). The PAI site carries a headline about families updating vaccines after a WhatsApp reminder [V headline only]: a sign the health system already uses the same channel.
5. **Use the web as the funnel.** Their calculators and week pages bring search visitors to the app. Mi Bebé's public week pages and the site's calculators are the same asset; the site batches from the 4 November night run are still open.
6. **Stretch the lifetime.** A pregnancy app keeps a user about nine months. The baby years multiply that, and make every later business option stronger.
7. **Measure four numbers and nothing else for now:** arrivals that finish onboarding, mothers who return in week one, weekly active mothers, invitations accepted per mother. The counters exist; the baseline is unread.
8. **Answer people.** "Support does not answer" is one of their complaint themes. A WhatsApp reply within a day is a visible difference at this size.
9. **Fix localisation before the second market,** not after. Their Nordic expansion shows the cost.

---

## Later

One line each, noted and not analysed:

- Benefits or offers tab with local partners (monetisation; out of scope here).
- Insurance, shop, discount codes, sanatorio or ecografía listings, baby-shower services (monetisation; out of scope).
- Sponsored content and brand campaigns in the Baby Journey style (monetisation; out of scope).
- A paid tier (courses or an assistant), as discussed in FLO-BENCHMARK.
- An AI question assistant, only with the FLO-BENCHMARK F2 guardrails.
- Community beyond a moderated WhatsApp group.
- Video and podcast content.
- Feeding, sleep and nappy logs for the baby.
- Twins in the interface.
- Content to age 5 (after the first year proves itself).
- White noise, eye-colour and height calculators (acquisition toys for the site, not the app).

---

## Needs Anton

1. **Confirm or correct the five defaults used:** (1) scope = pregnancy and baby years; (2) send screenshots or a screen recording of Baby Journey's onboarding and main tabs; (3) which parts of Baby Journey you like most; (4) open to visual changes = yes (section 8); (5) anything already decided not to build.
2. **Clinical reviewer:** who, registration number, agreement, and whether she or he will also be the public face. `[COMPLETAR]`
3. **Decision:** may a visitor see her week before signing in? It changes the account-first contract in `lib/auth`.
4. **Google Play organisation account** (D-U-N-S), still the blocker for the listing.
5. **Read `/admin/metricas`** and write down the current funnel numbers; confirm the production flags (`guarani`, `recomendados`) and that the push cron is running.
6. **WhatsApp Business Platform:** cost per message in Paraguay, template approval, and whether Responde can carry the pilot. `[COMPLETAR]`
7. **Official sources still missing** `[COMPLETAR]`: the child check-up schedule after day 28 and the growth-curve standard; a current edition of the child health booklet; whether 141 is still the right emergency number; the caesarean rate and the public, IPS and private split of births; whether carriers zero-rate WhatsApp; smartphone ownership as its own figure.
8. **Native Guaraní reviewer**, and a voice for the audio idea.
9. **Lawyer review** of the rights calculator and the privacy texts (open from earlier docs).
10. **Latin America leads to confirm before use:** prenatal-visit numbers for Bolivia, Peru, Colombia, Mexico and Uruguay came from search summaries only.
11. **Threshold for showing poll results** (how many answers before "así respondieron otras mamás" appears).
12. **A real-phone offline test:** sign in on an inexpensive Android phone, open Hoy, a week and the kick counter, switch to airplane mode and open them again. The local test could not prove this.

---

## Sources and verification log

**Opened by the manager session on 25 Nov 2026 [V]**

- <https://babyjourney.io/> (claims: free, age 5, 500,000, article authors, feature list)
- <https://babyjourney.io/app-features/> (the "most appreciated features" list)
- <https://babyjourney.io/pregnancy-by-week/pregnancy-week-20/> (three sections; word counts by section)
- <https://babyjourney.io/press/> (700,000 users, profit headline, age-5 extension, clinic, CEO)
- <https://babyjourney.io/about-us/>, <https://babyjourney.io/for-advertisers/>, <https://babyjourney.io/insights-from-baby-journey/>, <https://babyjourney.io/faq/>
- <https://babyjourney.io/privacy-policy/> (identity number, BankID, OpenAI and Vertex AI, persona, partners, retention)
- iTunes lookup for app id 1515225502 in `se`, `no`, `dk`, `fi` (ratings, version, language, description, release notes)
- <https://play.google.com/store/apps/details?id=se.babyjourney&hl=en&gl=SE> (rating, reviews, downloads, ads, data safety, three reviews)
- App Store review feed, Sweden page 1, compared with the worker's dump (first rows match; 628 rows; low-star recount)
- <https://www.mspbs.gov.py/portal/33532/vacunacion-en-el-embarazo-cuidarte-tambien-protege-al-bebe.html>
- <https://www.ine.gov.py/noticias/2993/en-paraguay-el-279-de-la-poblacion-de-5-y-mas-anos-habla-solo-guarani-y-387-utiliza-guarani-y-castellano-en-el-hogar>
- <https://www.bacn.gov.py/leyes-paraguayas/4428/ley-n-5508-promocion-proteccion-de-la-maternidad-y-apoyo-a-la-lactancia-materna>
- <https://www.who.int/news/item/07-11-2016-new-guidelines-on-antenatal-care-for-a-positive-pregnancy-experience>
- <https://pai.mspbs.gov.py/esquema-de-vacunacion-2-2/> (page exists; schedule itself is an image I did not view)
- Mi Bebé files: `lib/seed/approvals.json`, `reviewers.json`, `articles.json`, `videos.json`, `food.json`, `perspectives.json`, `lib/weeks.ts` (week 20), `lib/auth/access.ts`, `lib/community/launch.ts`, `lib/push/lapse.ts`, `lib/baby/content.ts`
- Mi Bebé screenshots: first load, Hoy (top and full page), week 24, tools grid, ¿Puedo comer…?, baby mode; `perf.json` from the local production build. The worker's run report (97 screenshots, onboarding table, offline table) is quoted as [W].
- <https://app.embarazo.com.py/> and `/guias` (public pages, signed out)

**Read by workers, extract checked by the manager [W]**

- "Mi Libreta Prenatal", MSPBS with UNFPA, 3rd edition 2021: <https://paraguay.unfpa.org/sites/default/files/pub-pdf/libreta_prenatal_2021.pdf>
- INE, "Tecnología de la Información y Comunicación, EPHC 2025": <https://www.ine.gov.py/publication-single.php?codec=319>
- PAI "Esquema regular de vacunación 2026" poster: <https://pai.mspbs.gov.py/wp-content/uploads/2025/07/Esquema-vacunacion-2026-1.jpg>
- MSPBS prenatal norm (September 2015) and "Libreta de Salud del Niño y la Niña" (2013): both older than five years
- Argentina, "GPC Atención Prenatal de Bajo Riesgo 2023" (at least 8 visits)
- StatCounter mobile OS share for Paraguay: <https://gs.statcounter.com/os-market-share/mobile/paraguay>
- App Store version history for Baby Journey; 628 App Store reviews (Sweden 500, Norway 105, Denmark 22, Finland 1)

**Not verified [NV]**

- Baby Journey's onboarding screens and length, home layout, notification settings, community rules, whether the doula chat is answered by a person, its colours and illustration style, App Store screenshot captions.
- Google Play review themes (only three reviews read); Trustpilot and forum opinions (none found).
- Baby Journey's real user numbers, funding, headcount.
- Anything in "Needs Anton" item 7 and item 10.

**Method notes**

- No account was created, nothing was installed, bought or accepted on Baby Journey's side.
- Review counts are keyword matches on the latest roughly 500 reviews per country, so older history and Android users are under-represented.
- Mi Bebé was run from `main` (`549705b`) as a local production build in device-only mode, which skips the sign-in wall that production has. Lab speed numbers are from a laptop with throttling, not from a real low-end phone. The local build needed `AUTH_REQUIRE_ACCOUNT=false` as a process variable (the same value the repo's Playwright config uses); no `.env` file was created and no tracked file changed.
