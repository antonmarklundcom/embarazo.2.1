# Nido — Full review & launch plan (July 2026)

Goal: make Nido the best pregnancy app in Paraguay. This document covers
(1) the current state, (2) issues found, (3) a phased plan, and (4) the
concrete data/content tasks only the founder can do.

---

## 1. Current state — honest assessment

**Strong foundation.** `npm run build` passes, all 44 unit tests pass.
The architecture is unusually clean for an MVP:

- Next.js 15 + React 19 + TypeScript strict, Tailwind, PWA via Serwist
  (offline precache of all 42 week pages + guías).
- Privacy-by-design is real, not marketing: all health data in
  IndexedDB (Dexie), `db()` throws server-side, API params are
  zod-whitelisted with tests, optional PIN → AES-GCM note encryption.
- Genuinely Paraguay-specific content: 42 weeks in es-PY voseo with local
  size comparisons, 8 guías (dengue, tereré, IPS vs privado, Registro
  Civil, PAI, derechos laborales…), derechos navigator (Ley 5508/2015,
  Ley 7383/2024, IPS), Emergencia mode (141/911, señales de alarma with
  Guaraní), digital carné perinatal, planning/cycle mode.

**What it is today:** an investor-grade MVP running entirely on
placeholder business data. The code is launch-quality; the *data* is not.

---

## 2. Issues found

### 2.1 Launch blockers (app must NOT go public with these)

| # | Issue | Where |
|---|-------|-------|
| B1 | **All videos point to `dQw4w9WgXcQ`** — every video in the gallery rickrolls the user. | `lib/seed/videos.ts` |
| B2 | **Directory is 100% invented** — fake sanatorios with non-working +595 numbers. A pregnant woman tapping "WhatsApp" in an emergency-adjacent context and reaching a dead number is a trust/safety failure. | `lib/seed/directory.json` |
| B3 | **Placements & events are placeholders** (fake sponsors, fake charlas with dates frozen at build time). | `lib/seed/placements.json`, `lib/seed/events.ts` |
| B4 | **No real medical reviewer.** `NEXT_PUBLIC_MEDICAL_REVIEWER` is unset and content has not been reviewed by a gineco-obstetra. For a health app this is both a credibility and a liability issue. | `.env`, all content |
| B5 | **Guaraní strings unreviewed** — flagged in DECISIONS.md as drafts pending native-speaker review. | `lib/emergency.ts` |
| B6 | **Legal figures unverified** — the derechos module states specific numbers (18 semanas, 100% subsidio, 4 h Ley 7383/2024, fuero 1 año). DECISIONS.md itself says these must be re-verified before launch. | `lib/derechos.ts` |
| B7 | **No privacy policy / terms page.** The app promises privacy but has no legal text, no `/privacidad` route. Paraguay's new personal data protection law makes this non-optional; health data is sensitive data. | missing route |

### 2.2 Technical issues (code fixes, roughly in priority order)

1. **No data export/backup.** All health data lives only in IndexedDB.
   If the phone is lost, the browser clears site data, or the user
   reinstalls, *everything is gone* — journal, photos, carné photos,
   weights, cycles. For the app's core promise this is the biggest gap.
   Fix: "Descargar mis datos" (JSON + photos) and import, in Ajustes.
2. **Storage can be evicted silently.** The app never calls
   `navigator.storage.persist()`. Browsers may evict IndexedDB under
   storage pressure — catastrophic here. One-line fix + UI hint.
3. **Pinch-zoom is disabled** (`maximumScale: 1` in `app/layout.tsx`).
   Accessibility problem (WCAG 1.4.4), especially for a broad audience.
4. **No `app/error.tsx` / `app/not-found.tsx`** — an unexpected runtime
   error white-screens the app; unknown URLs get the default 404.
5. **No offline fallback page** for routes outside the precache
   (e.g. `/derechos`, tools pages on first offline visit).
6. **No analytics at all.** You cannot measure installs, retention, or
   which content works. A privacy-respecting, cookie-less aggregate
   counter (self-hosted Umami/Plausible, or a simple ping) is compatible
   with the privacy stance if disclosed.
7. **No install UX.** No `beforeinstallprompt` handling, no iOS
   "Agregar a inicio" instructions. Install is the whole distribution
   model ("se instala desde un link") — this needs a first-class flow.
8. **SEO/acquisition surface is thin.** No landing page for
   non-users, no `sitemap.xml`/`robots.txt`, no per-guía OG images. The
   guías are the natural organic-search funnel ("dengue embarazo
   paraguay", "carné perinatal") and are invisible today.
9. **`/api/v1/go` has no rate limiting** and the attribution webhook can
   be spammed. Low risk, cheap to mitigate.
10. **Events dates are computed at module load** — fine for demo, but
    must become fixed timestamps with real data (already noted in code).
11. **PWA polish:** manifest has no `screenshots` (richer Android
    install sheet), icons are generated placeholder art.

### 2.3 Product gaps (to actually win the market)

- **The app ends at birth.** Week 42 is the last screen. Users churn at
  their happiest moment. A **"Ya nació" postpartum mode** (PAI vaccine
  calendar for the baby, lactancia, puerperio alarm signs, growth,
  Registro Civil checklist reusing the existing guía) doubles the
  lifetime of every user and is the single biggest retention lever.
- **Appointment reminders are in-app only.** A banner you only see if
  you open the app is not a reminder. Local notifications (opt-in, via
  the already-installed service worker) for controles and vaccine dates.
- **Only 8 guías.** Great ones, but a content moat needs 30–50 covering
  the questions women actually search (see task list §4.3).
- **Directory covers 4 of 18 departments** (Capital, Central, Alto
  Paraná, Itapúa) — right priority order, but coverage is the product.
- **No sharing loop.** No "compartir mi semana" card, no invite for the
  partner. Pregnancy is social; WhatsApp-native sharing is free growth
  in Paraguay.
- **Guaraní is only on the emergency screen.** Expanding jopara to tips
  and alarm-adjacent content is a differentiator no global app will match.

---

## 3. The plan

### Phase 0 — Hardening (dev work, ~1 week)
Code-only, no external dependencies:
- [ ] Data export/import ("Descargar/restaurar mis datos") in Ajustes
- [ ] `navigator.storage.persist()` + status in Ajustes
- [ ] `/privacidad` page (policy text from founder, see §4.6)
- [ ] `app/error.tsx`, `app/not-found.tsx`, offline fallback
- [ ] Remove `maximumScale: 1`
- [ ] Hide the video gallery behind a flag until real videos exist
      (ship nothing rather than rickrolls)
- [ ] Install-prompt flow + iOS instructions
- [ ] `sitemap.xml`, `robots.txt`, per-page metadata for guías
- [ ] Basic rate limit on `/api/v1/go`

### Phase 1 — Real data & credibility (founder-driven, 2–4 weeks)
- [ ] Real directory for Capital + Central (§4.1)
- [ ] Medical reviewer on board; 42 weeks + guías + alarm signs reviewed (§4.4)
- [ ] Lawyer verifies derechos figures (§4.5)
- [ ] Native Guaraní review (§4.4)
- [ ] Real curated videos (§4.2)
- [ ] Privacy policy + legal entity (§4.6)
- [ ] Branding pass: real logo/icons, manifest screenshots
- [ ] Public landing page at the root domain
- **→ Soft launch**: 50–100 real users via WhatsApp groups / consultorios

### Phase 2 — Growth (post-launch, 1–2 months)
- [ ] Privacy-friendly aggregate analytics; define north-star metric
      (suggested: weekly active installed users)
- [ ] Local notifications for appointments (opt-in)
- [ ] Content engine: 2 guías/week (§4.3), each targeting a real search query
- [ ] "Compartir mi semana" WhatsApp card
- [ ] Directory expansion to remaining departments; first paying sponsors
- [ ] Feedback channel (WhatsApp button already exists — staff it)

### Phase 3 — Moat (months 3–6)
- [ ] **Postpartum mode** ("Ya nació"): PAI baby vaccine calendar,
      lactancia, puerperio, growth tracking
- [ ] Partner mode / share-with-papá
- [ ] Guaraní expansion beyond emergencia
- [ ] Institutional partnerships (consultorios, sanatorios, possibly
      MSPBS/USF alignment for the carné and PAI content)
- [ ] Monetization: sponsored placements with real pricing, directory
      "destacado" tier — the rails are already built

---

## 4. Founder task list — data & content only you can provide

### 4.1 Directory (highest impact)
Fill `lib/seed/directory.json` with real, **consented** listings.
Per listing you need: name, category (`sanatorio`, `ecografia`,
`farmacia`, …), department slug, city, address, WhatsApp number
(verified working), Google Maps URL, sponsored yes/no.
Start with **Asunción + Central** (~70% of your market). Method:
call/WhatsApp each business, confirm they take pregnancy-related
consultas via WhatsApp, get explicit OK to be listed. Target: 30–50
listings before launch.

### 4.2 Videos
Replace every `youtubeId` in `lib/seed/videos.ts` with real, curated
es-PY (or neutral Spanish) videos — ideally from official channels
(MSPBS, PAHO, hospitals). Verify embedding is allowed. 8–12 videos
across the existing topics is enough.

### 4.3 Articles — editorial calendar (2/week suggested)
The 8 existing guías set the voice (es-PY voseo, practical, local
logistics). Highest-value next topics, roughly in order:

1. Alimentación en el embarazo con comida paraguaya (qué sí/qué no:
   mandioca, chipa, carne asada, pescado de río y mercurio)
2. Anemia y hierro (very prevalent locally)
3. Preeclampsia / presión alta — señales
4. Diabetes gestacional y la curva de azúcar
5. Parto normal vs cesárea en Paraguay (tasas, qué preguntar)
6. Lactancia: primeros días, agarre, mitos
7. Salud mental: ansiedad y depresión perinatal, dónde pedir ayuda
8. Sexo en el embarazo
9. Ecografías: cuáles, cuándo, cuánto cuestan (IPS/público/privado)
10. Embarazo adolescente: derechos y acompañamiento
11. Violencia durante el embarazo — Línea 137, cómo pedir ayuda
12. Toxoplasmosis, chagas y otras infecciones locales
13. Medicamentos comunes: qué se puede tomar y qué no
14. El puerperio: los primeros 40 días
15. Trámites IPS paso a paso (adherir al bebé, subsidio)
16. Preparar a los hermanitos / la familia
17. Calor extremo y embarazo (golpe de calor, hidratación)
18. Yuyos y remedios caseros: cuáles evitar

Format per article: título, excerpt (1–2 lines), ~600–900 words of HTML
following the existing structure in `lib/seed/articles.ts`, cluster,
date. Every article ends with the standard disclaimer and gets medical
review before publishing.

### 4.4 People to recruit
- **Gineco-obstetra reviewer** (paid or revenue-share): reviews the 42
  weeks, all guías, señales de alarma, and each new article. Their name
  goes in `NEXT_PUBLIC_MEDICAL_REVIEWER` — this is your credibility.
- **Native Guaraní speaker** (ideally health-adjacent): review/fix the
  jopara strings in `lib/emergency.ts`, then help expand.

### 4.5 Legal verification
- Labor/social-security lawyer confirms every figure in
  `lib/derechos.ts`: Ley 5508/2015 details, Ley 7383/2024, IPS subsidio
  rules (4 meses de aporte, semana 38), bonificación familiar. Set a
  recurring re-verification (every 6 months).
- Draft the privacy policy + terms (health data = sensitive data under
  Paraguay's data protection regime; the honest local-only story makes
  this easy, but it must exist in writing).

### 4.6 Operations
- Domain + Hostinger deploy; set `NEXT_PUBLIC_APP_URL`
- Business WhatsApp number → `NEXT_PUBLIC_BUSINESS_WHATSAPP` (and staff it)
- Legal entity / RUC for sponsor invoicing
- Optional: `SHEETS_WEBHOOK_URL` for click attribution
- Branding: commission a real logo (current icons are generated
  placeholders); produce 2–3 app screenshots for the manifest and for
  WhatsApp/social sharing

### 4.7 Real events
Replace `lib/seed/events.ts` with real charlas/talleres (fixed
timestamps, confirmed with organizers). If none exist yet, hide the
Eventos tab until they do — or create the first one yourself (a free
charla with your medical reviewer is also a marketing event).

---

## 5. Suggested success metrics

- **Installs** (PWA installed, not just visits)
- **W4 retention** of installed users (opens in week 4 after install)
- **Carné/tools usage** — % of users with ≥1 health record (depth)
- **WhatsApp clicks** to directory/placements (monetization signal)
- **Directory coverage** — departments with ≥5 live listings
