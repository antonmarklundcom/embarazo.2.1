# embarazo.com.py — marketing & content site plan

> Status: **approved, self-build track**, September 2026 update.
> Business goal of the site: send qualified organic traffic from Paraguay
> to install and use **Mi Bebé** at `app.embarazo.com.py`. Nothing else.
>
> **September 2026 decision**: the founder is rebuilding `embarazo.com.py`
> (currently WordPress) **by hand as static HTML/PHP**, outside this repo
> and outside any Claude-driven build. The Next.js/MDX/shared-repo build
> plan below (§2, §7, §8, the Opus/Sonnet phase roadmap) is **superseded**
> for the site's *implementation* — it stays in this document as the
> content/SEO/architecture reference (sitemap in §3, keyword clusters in
> §4, page templates in §4.4, the five pilot pages in §9) because that
> part of the thinking still applies to a hand-built site. See §2A for
> what actually ships.
>
> Read with `docs/FABLE-PLAN-2026-08.md` (positioning decisions),
> `docs/MVP-AND-MONETISATION.md` §3–4 (monetisation + acquisition) and
> `docs/HANDOFF-2026-08-21.md` §3 (founder critical path — the medical
> reviewer gate applies to this site too).

---

## 0. The five decisions this plan needs from you

Each comes with a recommendation so you can answer "yes" or correct it.

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Positioning hierarchy** on the site. The brief leads with privacy; the Aug-2026 founder decision made the app account-first / family-first and demoted privacy to "good engineering". | Site leads with **"hecha para Paraguay"**, then **gratis + se instala desde un link**, then **seguila en familia por WhatsApp**, and carries **"tus datos son tuyos"** as a visible trust pillar (its own page, a strip on every page), never as the H1. Copy must stay honest: "sin cuenta, todo queda en tu teléfono; con cuenta, el servidor guarda un sobre que no puede leer". Never "no recolectamos datos". |
| D2 | **Same repo or separate?** | **Separate repo** (`antonmarklundcom/embarazo.site`), Next.js 15 with `output: "export"`, deployed as static files (Hostinger static hosting on the root domain, or Cloudflare Pages). Reasons in §2. |
| D3 | **Who owns the SEO surface?** The app today indexes `/semana/1–42` and `/guias/[slug]` on `app.embarazo.com.py`. Two domains ranking for the same query is the one self-inflicted mistake to avoid. | The **site becomes canonical for all public content**. App week and guide pages get a cross-domain `canonical` to the site and leave the app sitemap; `/conoce` 301s to `embarazo.com.py`. Details in §3.4. |
| D4 | **Analytics on the site.** The app ships no tracking SDK. A marketing site with no measurement can't be optimised. | Cookieless, no-consent-banner analytics (self-hosted Umami or Plausible; Cloudflare Web Analytics is the zero-effort fallback). No Google Analytics, no Meta pixel. Install attribution via UTM on the deep link + an aggregate, user-less counter in the app (§5.4) — needs your OK as a data-contract change. |
| D5 | **Medical reviewer signs site content too.** | Yes. The site build fails for any page in the *salud* / *alimentación* / *semana* clusters without `reviewedBy` + `reviewedAt` in frontmatter — same gate as the app. This is on your critical path already (HANDOFF §3.1); the site adds ~60 pages to the reviewer's first pass. |

---

## 1. Goal, KPIs and the CTA system

### 1.1 One goal, three KPIs

| KPI | Definition | Why it is the one that matters |
|---|---|---|
| **Organic sessions from Paraguay** | Sessions with search as source, PY geo. | The site's only traffic job. |
| **App click-through rate** | Clicks on any "Abrir / Instalar Mi Bebé" CTA ÷ sessions. Target ≥ 8 % on content pages, ≥ 25 % on `/instalar`. | Measures whether pages convert, page type by page type. |
| **Arrivals that finish onboarding** | App-side aggregate: sessions arriving with `utm_source=site` that complete onboarding (no user id, no IP — same rules as K5 honest stats). | The real conversion. Installs are not observable on a PWA; onboarding completion is the closest honest proxy. |

Secondary: pages indexed, average position for the cluster head terms, WhatsApp shares per page.

### 1.2 The CTA system (one component, four variants)

All CTAs deep-link to the app with context so the app can prefill onboarding (small app change, §5.3):

```
https://app.embarazo.com.py/?utm_source=site&utm_medium=<page-type>&utm_campaign=<slug>&w=<week>   (week pages)
https://app.embarazo.com.py/?utm_source=site&utm_medium=tool&fpp=<yyyy-mm-dd>                       (calculator)
https://app.embarazo.com.py/?utm_source=site&utm_medium=article&modo=planeando                      (planning cluster)
```

| Variant | Where | Copy (es-PY, voseo) |
|---|---|---|
| **Primary button** | Hero on home, `/app`, `/instalar`; end of every article | "Abrir Mi Bebé — es gratis" |
| **Contextual week card** | Week pages, after the first H2 and at the end | "Seguí la semana 18 en la app: tu bebé, tus síntomas y tu control prenatal, sin conexión." |
| **Tool hand-off** | Calculator, ovulation calendar, rights pages | "Guardá tu fecha en Mi Bebé y calculá tu licencia de maternidad." |
| **Trust strip** | Footer-adjacent on every page | "Gratis · sin tienda · funciona sin datos · tus datos quedan en tu teléfono" |

No entry pop-ups, no exit-intent, no email capture. The audience is on a phone with expensive data, reading about a pregnancy; interruptions cost the trust the app runs on (founder rule from FABLE-PLAN §2.14 applies here too).

---

## 2. Repo and hosting recommendation

**Separate repo, static export.** Reasons:

- **Different deploy rhythm.** A content edit on the site should never rebuild the PWA. The app's service worker precaches all week and guide pages; every app build changes the precache manifest and pushes an "update available" toast to every installed user. Publishing an article must not do that.
- **Different performance profile.** The site is 100 % static HTML with no client data, no IndexedDB, no auth. `output: "export"` gives LCP < 1 s on a cheap Android over 3G and costs no Hostinger Node.js slot (`nextjs-national-lead-gen` §6).
- **Different risk profile.** The app carries health data and an auth surface; the site should have no API routes, no cookies and no server. A CSP with no `connect-src` beyond the analytics endpoint is achievable only if it is a separate deployable.
- **Content format.** The app's typed-TS-with-HTML content is right for eight guides that must precache offline. The site will carry 100+ long-form pages; **MDX with zod-validated frontmatter** is the right tool, and it keeps the app repo's "schema-validated at build time" discipline (`lib/content/schemas.ts` pattern).

What is shared, and how:

| Shared thing | Mechanism |
|---|---|
| Brand tokens (cream/petrol/terracotta/rose/sage palette, Nunito Sans, radii) | Copy `tailwind` theme tokens into the site repo once. They change rarely. |
| Week base data (size comparison, lengths, milestone) | One-off script `scripts/import-app-weeks.mts` that reads `lib/weeks.ts` from a checkout of the app repo and writes `content/semanas/*.mdx` seeds. Site pages then **extend** each week to 800–1,200 words; the app keeps its 100-word version. |
| Departments list | Copy `lib/departments.ts` (18 entries, stable). |
| Medical disclaimer, reviewer name | Same `NEXT_PUBLIC_MEDICAL_REVIEWER` env convention and the same build-time refusal without it. |

Anything that needs a server (WhatsApp weekly messages, sponsor forms, a lead endpoint) lives in the **app** repo behind `/api/v1/*`, never on the site.

---

## 2A. What actually ships (September 2026 — self-built HTML/PHP)

Supersedes the repo/hosting recommendation above. The site is being rebuilt
by hand, not generated by a Claude build session.

| Question | Answer |
|---|---|
| **Tech** | Static HTML pages + PHP (whatever the current WordPress hosting can already serve — no new runtime needed). No Next.js, no MDX, no build step, no shared repo with the app. |
| **Repo** | Founder's choice — a separate repo if useful for version history, or no repo at all if the host is edited directly. Not `antonmarklundcom/embarazo.site`; nothing in this codebase depends on that name existing. |
| **Domain** | `embarazo.com.py` (the bare root domain) — this is what currently serves WordPress and is being replaced in place. `app.embarazo.com.py` is a separate subdomain and is untouched by this work; it keeps serving the Next.js app from this repo. |
| **DNS** | No change expected: the root domain already resolves to the hosting account that runs WordPress today. Swapping WordPress for static HTML/PHP on the same host needs no DNS edit, only replacing the served files. `app.` stays on its current (Hostinger Node.js) target. |
| **What still applies from this plan** | The *content* thinking: the sitemap and URL structure (§3), the keyword clusters (§4.2), the page templates (§4.4), the five pilot pages (§9). These are hosting-agnostic — write them as HTML/PHP instead of MDX/React and the architecture holds. |
| **What no longer applies** | §2's Next.js repo recommendation, §7.1's Next.js-specific build checklist (`output: "export"`, `generateMetadata`, JSON-LD via Metadata API — the *content* of that checklist, e.g. canonical tags, sitemap.xml, JSON-LD blocks, Core Web Vitals budget, still applies; only the Next.js *mechanism* for producing it doesn't), the zod frontmatter/build-gate machinery in §7.3 (a hand-built site enforces the reviewer-sign-off and sources rule by hand, editorially, not by a failing build), and the Opus/Sonnet phased roadmap in §8 (no Claude build session runs this). |
| **The one required integration point** | Every "open the app" link on the site is a plain URL with query params, e.g. `https://app.embarazo.com.py/?w=20` for week 20, or `https://app.embarazo.com.py/?fpp=2026-11-03` from a due-date calculator. No SDK, no shared code — just a link. See §5.3; the app-side handling of these params is being added in this repo (`docs/BUILD-PLAN.md` follow-up), independent of how the site itself is built. |
| **D1–D5 (§0)** | Recommendations in §0 stand as the founder's answers (site leads with "hecha para Paraguay", trust strip not H1; cookieless analytics if any is added later; medical reviewer signs health/legal content — apply this editorially, not as a build gate; canonical/SEO-ownership rule in §3.4 still the goal). D2 (repo/hosting) is superseded by this section. |

---

## 3. Site architecture and sitemap

### 3.1 Archetype

`nextjs-national-lead-gen` §1: **B (media/content brand) primary, A (product marketing) secondary.** Roughly 90 % of URLs are content; five URLs sell the product. Content pages carry ONE soft-but-visible product CTA each; the product pages carry the hard CTA.

### 3.2 Core (product) pages

| URL | Purpose | Primary intent |
|---|---|---|
| `/` | Home: hero → three proof blocks (Paraguay, familia, tus datos) → "esta semana" entry (pick a week) → guides teaser → install CTA | Brand + "app de embarazo Paraguay" |
| `/app` | What the app does: the two modes, tools, the 8 guides, rights browser, emergency, "cerca tuyo". Screenshots per feature. | "app embarazo gratis", "app para embarazadas" |
| `/instalar` | **The conversion page.** Device-detected instructions (Android Chrome → prompt; iPhone Safari → share sheet), what "PWA" means in plain words, "no está en Play Store y no hace falta", storage/offline facts. `HowTo` schema. | "instalar app mi bebé", branded |
| `/privacidad` | The marketing story of the data model, honest in both modes. Links to the app's legal `/privacidad` and `/borrar-cuenta`. | Trust, "app embarazo privacidad" |
| `/preguntas-frecuentes` | "¿Es gratis?", "¿Necesito cuenta?", "¿Funciona sin internet?", "¿Reemplaza a mi obstetra?", "¿Está en Play Store?", "¿Quién revisa el contenido?". `FAQPage` schema. | Long-tail branded + "es gratis" |
| `/familia` | Following a pregnancy as partner/family: WhatsApp invite, what they see, what stays private. Speaks to the papá. | "app para el papá embarazo", "seguir embarazo pareja" |
| `/sobre` | Who makes it, who reviews it (the gineco-obstetra with name and registry number), sources policy, correction policy. E-E-A-T page. | Credibility |
| `/profesionales` | For obstetras, sanatorios, vacunatorios: hand the app to patients, appear in "cerca tuyo", sponsor a charla. Feeds MVP-AND-MONETISATION §3. | Phase 3 |
| `/contacto` | WhatsApp + email only. No form (no backend). | — |

Note: **no `/precios` page for the product.** "Es gratis" lives in the FAQ and the trust strip. `/precios` is reserved for the SEO magnet in §3.3 (what things cost in Paraguay), which is the app's "Precios" tool as public content.

### 3.3 Content architecture (the SEO surface)

```
/semana                       hub: all 42 weeks, grouped by trimester, plus the calculator
/semana/[1..42]               week page (long-form; the app's version is the short one)
/trimestre/[1|2|3]            trimester hub: what happens, controls due, rights that kick in, weeks list
/calculadora                  due date + current week calculator (client-side only, no data leaves)
/calendario-de-ovulacion      planning mode entry: fertile window estimate, honest disclaimer

/salud/                       hub  — cluster: health in pregnancy (Paraguay-specific angle)
/alimentacion/                hub  — cluster: food, drink, tereré/mate, local diet
/tramites/                    hub  — cluster: carné, IPS vs privado, Registro Civil, cédula
/derechos/                    hub  — cluster: Ley 5508, Ley 7383, IPS subsidio, lactancia, fuero, Tekoporã
/parto/                       hub  — cluster: bolso, señales, sanatorio, posparto inmediato
/planear/                     hub  — cluster: preconcepción, fertilidad, primeros síntomas, test
/[cluster]/[slug]             article

/precios/                     hub  — "¿cuánto cuesta…?" in Paraguay (Phase 3, data-gated)
/precios/[estudio]            ecografía, control prenatal, parto en sanatorio, cesárea, vacunas…
/cerca/[departamento]         local page per department (Phase 3, gated on real directory data)
```

Cluster ↔ app mapping, so the site mirrors what the app actually has:

| Site cluster | App surface it feeds | Existing guides that seed it |
|---|---|---|
| `/salud` | Week pages, Síntomas y ánimo, Emergencia, Dental, Kegel, Sueño | #1 Dengue/zika/chikungunya · #6 Señales de alarma · #7 Vacunas PAI |
| `/alimentacion` | Comer (food lookup), tip diario | #2 Tereré, mate cocido y cafeína |
| `/tramites` | Carné perinatal tool, Resumen imprimible | #4 Registro Civil y cédula · #5 Control prenatal IPS / privado / carné |
| `/derechos` | `/derechos` rights browser with computed leave dates | #8 Derechos de la embarazada que trabaja |
| `/parto` | Checklist, Contracciones, Emergencia | #3 Qué llevar al sanatorio |
| `/planear` | Planeando mode: calendario, fertilidad, checklist preconcepción | — (new content) |

### 3.4 What lives on the site vs only in the app (and how to stop cannibalisation)

| Content | Site | App | Rule |
|---|---|---|---|
| 42 weeks | **Canonical**, long-form | Short, offline, personalised (your date, your day count) | App `/semana/[n]` sets `alternates.canonical = https://embarazo.com.py/semana/[n]` and leaves `app/sitemap.ts`. Text stays similar enough for the canonical to be honoured (the app text is a subset of the site's). |
| 8 guides | **Canonical**, expanded under cluster hubs | Kept as-is for offline reading | App `/guias/[slug]` canonical → site article. Slugs need not match; the canonical is explicit. |
| Rights, laws, leave dates | Explanatory articles | The **calculator** and the personalised browser | Site explains and cites; app computes. Site never ships a leave-date calculator — that is the hand-off. |
| Emergency / alarm signs | One article (`/salud/senales-de-alarma`) with 141/911 `tel:` links | `/emergencia` SOS, saved contacts, Guaraní | Site article ends with "guardá tus contactos en la app". |
| Food lookup, prices, directory, events, names | Hub + long-form pages where public data exists | The tools | Site pages are **gated on the same review/placeholder gates** as the app (`isPlaceholderRecord`, `isUnreviewed`). No invented sanatorios on the public web. |
| Symptom diary, kicks, contractions, weight, photos, Bebé IA | Feature descriptions on `/app` only | The tools | Personal tools have no search value (app `robots.ts` already agrees). |
| `/conoce` | — | 301 → `https://embarazo.com.py/` | One landing page, not two. |
| Privacy policy, terms, `/borrar-cuenta` | Linked from site `/privacidad` | **Stay in the app** (Play requires them on the app origin) | Site never duplicates legal text. |

**Week-page long-tail** ("semana 18 de embarazo síntomas", "…ecografía", "…panza", "…movimientos") is handled **inside** the week page with H2s and an FAQ block, not with separate URLs. Separate symptom pages per week would be 42 thin pages fighting the parent.

### 3.5 Department pages: yes, but late and gated

Local intent exists ("sanatorio para embarazadas Ciudad del Este", "ecografía Encarnación precio", "IPS Luque embarazo") but a department page with no verified listings is a thin page under Google's eyes and a broken promise under a mother's. Build `/cerca/[departamento]` **only** for departments with ≥ 5 published (non-placeholder) listings, starting with Capital, Central, Alto Paraná, Itapúa. Each page: where controls happen (IPS regional / hospital MSPBS / sanatorios), vaccination points, emergency numbers, published listings, events, and the CTA "vé todo el directorio en la app, sin conexión".

---

## 4. Content and SEO strategy for Paraguay

### 4.1 Search intent by page type

| Page type | Intent | What must be on the page to win it |
|---|---|---|
| Week page | Informational, emotional, **recurring** (she comes back every week) | Baby size in a Paraguayan comparison, what changes for her, symptoms that are normal vs when to call, what control/study is due in the PY system this week, one "esta semana en Paraguay" note (heat, dengue season, tereré), FAQ, next/prev week |
| Trimester hub | Navigational + planning | Timeline of controls (MSPBS/IPS schedule), rights that start, studies, weeks list |
| Calculator | Transactional (wants a number) | Instant result without page reload, both "semanas" and "FPP", what the number means, hand-off to app |
| Cluster article | Informational, Paraguay-specific | Answer in the first 100 words, local specifics (which office, which law, which number), sources, reviewer, date |
| Rights article | Informational → procedural | The law article number, who qualifies (IPS / no IPS / no trabaja), steps, documents, what to do if refused |
| Price page | Transactional (comparison) | Price ranges by department and by public/IPS/private, date of the data, what is included |
| Product pages | Branded / navigational | Fast, honest, install in one tap |

### 4.2 Keyword clusters (es-PY, voseo)

Volumes are **not** estimated here — there is no reliable PY-level keyword data in this session, and invented numbers would be worse than none. Priority is by intent strength and by how unanswered the query is today in Paraguay (the FLO-BENCHMARK finding that nobody answers "¿cuánto cuesta una ecografía?" applies to most of the `tramites`, `derechos` and `precios` clusters).

| Cluster | Head terms | Long-tail examples | Priority |
|---|---|---|---|
| Semanas | "semanas de embarazo", "semana 20 de embarazo", "embarazo semana a semana" | "semana 12 de embarazo síntomas", "semana 20 ecografía morfológica", "a las cuántas semanas se siente el bebé" | **P1** — 42 pages, the traffic engine |
| Calculadora | "calculadora de embarazo", "calculadora fecha probable de parto", "cuántas semanas de embarazo tengo" | "calcular semanas de embarazo por FUM", "fecha probable de parto por ecografía" | **P1** — highest CTR to app |
| Trámites | "carné perinatal", "carné perinatal Paraguay", "control prenatal IPS", "cédula del bebé recién nacido Paraguay", "certificado de nacido vivo" | "cómo sacar el carné perinatal", "IPS embarazo requisitos", "registro civil inscripción de nacimiento Paraguay" | **P1** — unanswered, high trust value |
| Derechos | "licencia de maternidad Paraguay", "ley 5508", "subsidio maternidad IPS", "derechos de la embarazada que trabaja" | "permiso para control prenatal ley 7383", "me despidieron embarazada Paraguay", "licencia de paternidad Paraguay", "hora de lactancia ley" | **P1** — legal, evergreen, low competition |
| Alimentación | "tereré en el embarazo", "mate en el embarazo", "qué no comer embarazada" | "mate cocido embarazo", "cocido con leche embarazo", "chipa embarazo", "yuyos en el embarazo", "cafeína embarazo cuánto" | **P2** — Paraguay-only angle no global app has |
| Salud | "dengue en el embarazo", "vacunas embarazo", "señales de alarma embarazo" | "vacuna tdap embarazo Paraguay", "vacuna influenza embarazada PAI", "zika embarazo Paraguay", "presión alta embarazo síntomas" | **P2** — must carry reviewer + sources |
| Parto | "qué llevar al sanatorio", "bolso para el parto", "contracciones cada cuánto ir" | "bolso del bebé sanatorio lista", "parto en IPS qué llevar", "cesárea sanatorio privado precio" | **P2** |
| Planear | "días fértiles", "síntomas de embarazo primeros días", "test de embarazo cuándo hacer" | "calculadora de ovulación", "ácido fólico antes del embarazo", "checklist antes de quedar embarazada" | **P2** — feeds planeando mode |
| Precios | "cuánto cuesta una ecografía", "precio ecografía Asunción", "cuánto cuesta un parto en sanatorio privado" | "ecografía 4D precio Paraguay", "control prenatal precio sanatorio" | **P3** — gated on reviewed price data |
| Local | "sanatorio embarazadas Ciudad del Este", "ecografía Encarnación", "vacunatorio Luque" | per-department | **P3** — gated on real listings |
| Comparison | "mejor app de embarazo", "apps de embarazo gratis" | "app de embarazo en español", "alternativa a Flo embarazo" | **P2** — one honest comparison page (`/app/comparacion`): Mi Bebé vs the global apps on Paraguay content, offline, data policy |

### 4.3 Language rules

- **es-PY voseo** everywhere ("tomá", "registrá", "acercate"). Rioplatense vocabulary where PY and AR overlap, PY-specific where they differ: *sanatorio* (not clínica), *ecografía* (not ultrasonido), *carné* (not cartilla), *panza*, *remera*, *tereré*, *mamón*, *choclo*.
- Search-term reality: people also type in neutral Spanish ("cuántas semanas de embarazo tengo"). Titles and H1s use the query form; body copy uses voseo.
- **Guaraní**: inline, not as a locale. Alarm signs, the emergency call script and the rights headlines already have jopara drafts in the app (`lib/i18n/dict.ts`, `lib/emergency.ts`) pending native review. The site shows the same strings with `lang="gn"` under the Spanish on the emergency article and the rights hub. No `/gn/` routes, no hreflang, until there is a reviewer and institutional demand (HANDOFF §2.4).
- No medical imperatives without a source. "Muchas obstetras recomiendan…" + citation, not "debés…". The disclaimer component renders on every page in `salud`, `alimentacion`, `semana`, `parto`, `planear`.

### 4.4 Page templates

**Week page** (`/semana/[n]`, ~900 words)
1. H1 "Semana N de embarazo" · subtitle with trimester and "N−1 semanas y X días" convention explained once.
2. "Tu bebé esta semana" — size comparison (the app's Paraguayan progression), length/weight if measurable, milestone.
3. "Vos esta semana" — body changes, symptoms that are common, what is *not* normal (links to alarm signs).
4. "En Paraguay esta semana" — the control/study due per the MSPBS/IPS schedule, the vaccine if any, the rights milestone if any (e.g. week 38 IPS reposo), the seasonal note.
5. Contextual CTA card.
6. FAQ (3–5 questions from the long-tail list) with `FAQPage` schema.
7. Prev / next week, trimester hub, 2–3 related articles.
8. Reviewer, date, sources, disclaimer.

**Cluster article** (`/[cluster]/[slug]`, 800–1,500 words)
Answer-first lead → sections → "Paso a paso" or "Qué llevar" list where procedural → "Qué hace la app con esto" (one paragraph + CTA) → FAQ → related → reviewer/sources/date.

**Hub** (`/semana`, `/trimestre/n`, `/[cluster]`)
Intro paragraph that could rank on its own (200–300 words), then cards. Hubs are real pages, not tag lists.

**Calculator** (`/calculadora`)
Two inputs (FUM date or FPP date), instant result, week card pulled from the week content, "guardá esto en la app" hand-off with the date in the deep link. Pure client-side; nothing is sent anywhere, and the page says so.

### 4.5 Content sourcing and citations

Every health/legal page cites primary sources: MSPBS guías y normas, PAI esquema vigente, IPS resoluciones, Ley 5508/2015, Ley 7383/2024, Ley 5099/2013, Código del Trabajo, Registro Civil / Ministerio de Justicia, OPS/OMS for clinical baselines. Sources are frontmatter fields (`sources: [{title, url, publisher, accessed}]`) rendered as a list, so a reviewer sees them and a build can require them.

---

## 5. Conversion mechanics

### 5.1 Principles

- **Value before ask.** The page answers fully; the app is offered as "keep going", not as a gate.
- **No account to try.** Every deep link lands on the app's onboarding, where "seguir sin cuenta" remains available. The site never mentions Google sign-in in the CTA.
- **No data capture on the site.** No email, no phone, no forms. The only "capture" is the install itself.
- **One CTA per screen height, maximum.**

### 5.2 Placement by page type

| Page | Above the fold | Mid-page | End |
|---|---|---|---|
| Home | Primary button + "elegí tu semana" picker | Feature blocks each link to `/app#feature` | Primary button + trust strip |
| `/app` | Primary | Per-feature "abrí esta herramienta" deep links | Primary |
| `/instalar` | Device-specific one-tap | Screens per OS | Fallback: open in browser link |
| Week page | None (the content is the hook) | Contextual week card after section 3 | Contextual week card + prev/next |
| Cluster article | None | Inline "qué hace la app con esto" block | Primary + related |
| Calculator | Result → hand-off button with the date | — | "Seguí esta semana" card |
| Rights article | None | "Calculá tus fechas de licencia en la app" | Primary |
| Department page | None | Listings → "todo el directorio, sin conexión" | Primary |

### 5.3 The deep-link hand-off (small app change, app repo)

The app's onboarding reads optional query params on first load and prefills, then **drops them from the URL** before any storage write:

| Param | Effect |
|---|---|
| `w=<1..42>` | Preselects "Estoy embarazada" and sets an estimated LMP so the app opens on that week; the date step asks her to confirm or correct. |
| `fpp=<date>` / `fum=<date>` | Prefills the date step (the calculator sends this). |
| `modo=planeando` | Preselects the planning mode. |
| `utm_*` | Read once for the aggregate arrival counter (§5.4), never stored per user. |

Nothing here touches the server. It is a client-side read of `location.search`.

### 5.4 Measurement without surveillance

- **Site**: cookieless analytics (D4). Events: `cta_click` with `{page_type, variant}`, `whatsapp_share`, `calculator_result`.
- **App**: extend the existing anonymous aggregate stats (K5) with `arrivals_from_site{page_type}` and `onboarding_completed_from_site{page_type}` — counts only, no ids, no IP, batched. Needs a DECISIONS.md entry in the app repo; it is within the letter of ARCHITECTURE §4 but you should sign it.
- **WhatsApp**: a `wa.me/?text=` share button on every content page with a pre-written message ("Mirá, semana 20: …" + URL). Zero data, real virality in a WhatsApp-first market. The WhatsApp weekly-summary channel (FABLE-PLAN §2.12, P7) stays post-launch and lives in the app repo; when it exists, the site adds "Recibilo por WhatsApp" pointing at it.

---

## 6. Brand, design and tone

- **Same visual family as the app**: cream ground, petrol for structure, terracotta for the single CTA colour, pastel section tints (arena, lavanda, celeste, rosa, salvia) used as the app's cards already use them. Nunito Sans via `next/font`. Nothing dark, nothing navy/hot-pink (DECISIONS: "Visual language unchanged").
- **Patterns** (from the `nextjs-national-lead-gen` menu, pick few): split hero (copy left, phone frame with the real week screen right), **bento** feature grid on `/app` (mobile order defined first), big-type editorial for hubs, timeline layout for the trimester pages. That is all. No glass, no marquee, no count-ups.
- **Imagery**: real app screenshots (the repo's `gen:screenshots` script) and the week renders when `public/assets/semanas/` is filled (HANDOFF §2.5 — the same asset gap blocks the app's home LCP, so it is worth solving once). Illustrated, warm, not stock-photo-clinical. `higgsfield-web-imagery` can produce the hero set on a fixed budget once the slots are declared.
- **Tone**: warm, direct, never alarmist, never corporate. "Acompañamiento" not "monitoreo". Voseo. Guaraní where it already exists in the app. The privacy story is told as respect, not as fear: "es tu embarazo, son tus datos".
- **Restraint baseline**: 8 px grid, ~1.25 type scale, two typefaces max, one accent, one motion per screen, `prefers-reduced-motion` honoured.

---

## 7. Technical SEO and content governance

### 7.1 Checklist for the build

- [ ] `output: "export"`, `trailingSlash: false`, canonical per page via `alternates.canonical`; `metadataBase = https://embarazo.com.py`.
- [ ] `sitemap.ts` + `robots.ts` (Next Metadata API). Sitemap split by type (`/sitemap/semanas.xml`, `/sitemap/articulos.xml`) once > 200 URLs.
- [ ] Per-page `generateMetadata`: title ≤ 60 chars, description ≤ 155, OG image per page (generated at build with the week/article title on the brand ground — reuse the app's `gen:og` approach).
- [ ] JSON-LD: `Organization` + `WebSite` sitewide; `SoftwareApplication` (free, `applicationCategory: HealthApplication`, `operatingSystem: Android, iOS`) on `/` and `/app`; `HowTo` on `/instalar`; `MedicalWebPage` + `Article` with `reviewedBy` (Person, `medicalSpecialty`) on health/week pages; `Article` on legal/procedural pages; `FAQPage` where an FAQ block exists; `BreadcrumbList` everywhere.
- [ ] Core Web Vitals budget: LCP < 1.5 s on a mid Android over 3G, CLS < 0.05, INP < 100 ms. Static HTML, hero image `priority`, `next/image` everywhere, no client JS on content pages except the CTA and the share button; the calculator is the one interactive island.
- [ ] `lang="es-PY"` on `<html>`; `lang="gn"` on Guaraní spans.
- [ ] Internal linking rules enforced by a build script: every article links its hub + ≥ 2 related; every week links prev/next/trimester + ≥ 1 article; every hub links ≥ 5 children. Build fails otherwise.
- [ ] 404 and offline-friendly error page in brand.
- [ ] Security headers on the static host: CSP (no inline scripts except the JSON-LD nonce'd block, `connect-src` = analytics only), `Referrer-Policy: strict-origin-when-cross-origin`.

### 7.2 App-side changes (app repo, one small PR)

- `alternates.canonical` on `/semana/[n]` and `/guias/[slug]` pointing to the site; remove both from `app/sitemap.ts`.
- `/conoce` → permanent redirect to `https://embarazo.com.py/`.
- Onboarding query-param prefill (§5.3) and the aggregate arrival counter (§5.4).
- `NEXT_PUBLIC_SITE_URL` env so the app can link "leé más en embarazo.com.py" from week and guide pages.

### 7.3 Content versioning so the medical line never slips

Frontmatter schema (zod, build-time):

```yaml
title, description, cluster, slug
kind: medical | legal | procedural | product     # picks disclaimer + schema type
reviewedBy: { name, credential, registry }       # required when kind = medical
reviewedAt: 2026-09-01                            # required when kind ∈ {medical, legal}
updatedAt: 2026-09-01
sources: [{ title, publisher, url, accessed }]    # ≥ 1 required for medical/legal
weeks: [18, 19]                                   # optional, powers "related" on week pages
guarani: { ... }                                  # optional inline strings, flagged reviewed: false
```

- A `kind: medical` page with no reviewer, or a `legal` page older than 12 months without `reviewedAt` refresh, **fails the build** — the same posture as the app's `NEXT_PUBLIC_MEDICAL_REVIEWER` gate and `reviewedOnly` content gate.
- `dateModified` in schema comes from `updatedAt`; the visible line reads "Revisado por Dra. ___ · actualizado el ___".
- Content changes go through PRs; the diff is the changelog. Legal pages carry a "vigente a" line naming the law version.
- A `content/CHANGELOG.md` is not needed; git is the changelog. What is needed is the **review-debt report** the app already has (`lib/content/reviewDebt.ts`): port it as a build-time script that prints "12 medical pages unreviewed" so the reviewer's queue is visible.

---

## 8. Roadmap

> **Superseded by §2A (September 2026): the site is hand-built HTML/PHP,
> not a Claude-driven phased build.** This section is kept only as a
> reference for sequencing *what content to write first* (Phase 1's page
> list is still a reasonable priority order); ignore the Opus/Sonnet/PR
> mechanics below — there is no `embarazo.site` repo and no build session
> for this.

Model lanes follow the house rule: Opus for foundation, Sonnet for content and wiring, Fable never as a build session. Each phase is one PR in the new repo, merged green before the next starts (`phased-autonomous-build`). Once you approve this plan, the next step is a `plan.md` + `prompts/` in `embarazo.site` following that skill.

### Phase 0 — founder inputs (this week, no code)

| Item | Needed by |
|---|---|
| Approve D1–D5 above | Phase 1 start |
| DNS: `embarazo.com.py` → static host; `app.` stays on Hostinger Node | Phase 1 deploy |
| Medical reviewer name, credential, registry number (same person as the app) | Phase 1 build passes |
| Analytics instance (Umami/Plausible) or Cloudflare Web Analytics token | Phase 1 deploy |
| Confirm the app's week-render assets plan (they unblock both home LCPs) | Phase 2 |

### Phase 1 — launch with real SEO surface (Opus foundation ≈ 1 PR, Sonnet content ≈ 3 PRs)

**Opus-1 foundation**: repo scaffold, static export, brand tokens, MDX + zod frontmatter, build gates (reviewer, sources, internal-link rules), templates for week/article/hub/product, `sitemap`/`robots`/JSON-LD components, CTA component with deep-link builder, analytics wrapper, CI. Exit: build green with zero content; gates proven by a failing fixture.

**Sonnet-1 product pages**: `/`, `/app`, `/instalar`, `/privacidad`, `/preguntas-frecuentes`, `/familia`, `/sobre`, `/contacto`. Exit: Lighthouse ≥ 95 on all four categories on a mobile profile; every CTA resolves to a valid deep link.

**Sonnet-2 weeks + calculator**: import the 42 week seeds, extend each to the §4.4 template, `/semana` hub, three `/trimestre` hubs, `/calculadora`. Exit: 47 pages, all with reviewer frontmatter, FAQ blocks, prev/next; calculator unit-tested against `lib/pregnancy.ts` math (copy the tests).

**Sonnet-3 the 8 guides expanded + six hubs**: each existing guide becomes a 1,000–1,500-word article under its cluster; six hub pages with real intro copy; the comparison page. Exit: 15 pages; internal-link rule passes.

**App-side PR** (§7.2) ships the same week as the site goes live, not before.

Phase 1 total: ~70 indexable URLs, all reviewed, one deploy. This is enough to start ranking on the semanas and trámites clusters, which is where the unmet demand is.

### Phase 2 — topical authority (Sonnet, 4–6 PRs over ~6 weeks)

- `/derechos`: licencia de maternidad · subsidio IPS · permiso para controles (Ley 7383) · hora de lactancia · fuero maternal y despido · licencia de paternidad · Tekoporã y gratuidad MSPBS (7 pages).
- `/tramites`: carné perinatal · inscribirse en IPS estando embarazada · qué cubre IPS vs sanatorio privado · certificado de nacido vivo · inscripción en el Registro Civil · cédula del bebé · asignación familiar (7 pages).
- `/alimentacion`: tereré (split from the guide) · mate y cocido · yuyos · pescado de río y mercurio · chipa, sopa y asado: qué sí · antojos y anemia · hidratación con el calor (7 pages).
- `/salud`: one page per PAI vaccine in pregnancy · dengue season checklist · presión alta y preeclampsia · diabetes gestacional · dental · sueño · ejercicio y Kegel (8 pages).
- `/planear`: días fértiles · test de embarazo cuándo · primeros síntomas · ácido fólico · checklist preconcepción · si no llega el embarazo, cuándo consultar (6 pages).
- `/parto`: bolso mamá · bolso bebé · contracciones y cuándo ir · parto en IPS paso a paso · cesárea: qué esperar · primeros días en casa (6 pages).

Exit per PR: pages pass gates; hub updated; GSC shows indexing of Phase 1 before Phase 2 starts.

### Phase 3 — local and data-gated surfaces (after real data exists)

- `/precios/*` from the app's reviewed price guide (P6) — the single strongest unanswered query set in the market.
- `/cerca/[departamento]` for departments passing the ≥ 5 published listings rule.
- `/profesionales` and a sponsor deck link (MVP-AND-MONETISATION §3.3).
- Events calendar mirror (charlas, talleres) when `lib/seed/events.ts` has real entries.
- "Recibilo por WhatsApp" once P7 exists in the app.

### Phase 4 — later bets

- Guaraní inline expansion after native review; consider `/gn/emergencia` only.
- Baby names cluster (`/nombres`) — high volume, high thin-content risk; only with a real editorial angle (Guaraní names, PY registry rules on names).
- Postpartum cluster, pending the K17 product decision.
- Video: when `lib/seed/videos.ts` gets real IDs, embed on matching articles with `VideoObject`.

---

## 9. Five pilot pages, ready to write

### P-1 `/semana/20` — "Semana 20 de embarazo: ecografía morfológica, movimientos y la mitad del camino"

- **Intent**: informational + navigational ("semana 20 de embarazo", "ecografía morfológica semana 20", "semana 20 movimientos del bebé").
- **Title** (58): `Semana 20 de embarazo: ecografía morfológica y movimientos`
- **Description** (150): `Qué pasa en la semana 20: el tamaño de tu bebé, la ecografía morfológica, los primeros movimientos y qué control te toca en Paraguay. Revisado por obstetra.`
- **H2s**: Tu bebé esta semana (size comparison from `lib/weeks.ts`, weight/length) · Vos esta semana (panza, dolor ligamentario, sueño) · La ecografía morfológica: qué mira y dónde se hace (IPS / MSPBS / privado; link to `/precios/ecografia` when it exists) · Ya sentís pataditas? (when it is normal not to) · En Paraguay esta semana (control del segundo trimestre, calor/hidratación) · Señales para llamar al sanatorio (link) · Preguntas frecuentes (5) · Semana 19 / 21.
- **App hand-off**: contextual card after "Vos esta semana": "Registrá las pataditas y tu ánimo esta semana en Mi Bebé — sin conexión." Deep link `w=20`.
- **Schema**: `MedicalWebPage` + `FAQPage` + `BreadcrumbList`. Reviewer required.
- **Sources**: MSPBS norma de control prenatal; OPS/CLAP carné perinatal; WHO fetal growth reference.
- **App has**: the 100-word week card. **Site adds**: the ecografía section, the PY control schedule, the FAQ.

### P-2 `/calculadora` — "Calculadora de embarazo: ¿cuántas semanas tengo y cuándo nace mi bebé?"

- **Intent**: transactional ("calculadora de embarazo", "calculadora fecha probable de parto", "cuántas semanas de embarazo tengo").
- **Title** (57): `Calculadora de embarazo: semanas y fecha probable de parto`
- **Description** (152): `Ingresá la fecha de tu última menstruación o tu FPP y sabé al instante en qué semana estás y cuándo nace tu bebé. Gratis, sin registro, nada sale de tu teléfono.`
- **Structure**: calculator island at top (FUM or FPP toggle, result: "Estás en la semana 18 · 17 semanas y 3 días · FPP 12 de febrero") → result card pulls the week's size comparison → hand-off button "Guardá tu fecha en Mi Bebé" (`fpp=` deep link) → Cómo se calcula (Naegele, why the ecografía may move it) → Qué significa "semanas completas" → FAQ (4) → link to `/semana`.
- **Schema**: `WebApplication` (the calculator) + `FAQPage`. Kind: `medical` (reviewer signs the explanation).
- **Note**: reuse the app's `lib/pregnancy.ts` math and tests verbatim so both never disagree.

### P-3 `/derechos/licencia-de-maternidad` — "Licencia de maternidad en Paraguay: cuántas semanas, cuándo empieza y quién la paga"

- **Intent**: informational → procedural ("licencia de maternidad Paraguay", "ley 5508 licencia", "subsidio maternidad IPS cuánto").
- **Title** (60): `Licencia de maternidad en Paraguay: semanas, inicio y pago (Ley 5508)`
- **Description** (154): `18 semanas de licencia, cuándo podés empezar, qué pasa si tenés IPS y si no, cómo se paga el subsidio y qué hacer si tu empleador no cumple. Vigente 2026.`
- **H2s**: Cuánto dura (18 semanas; extensión a 24 en los casos de la ley) · Cuándo empieza (desde 2 semanas antes de la FPP; IPS reposo desde la 38) · Quién la paga: con IPS / sin IPS · Cómo tramitar el subsidio en IPS (documents, steps) · Tus otros derechos en el mismo período (fuero, lactancia, Ley 7383 permisos) · Si tu empleador no cumple (MTESS, where to go) · FAQ (5).
- **App hand-off**: "Ingresá tu FPP en Mi Bebé y te calcula la fecha más temprana de inicio, el fin de la licencia y el reposo IPS." Deep link `utm_medium=rights`.
- **Schema**: `Article` + `FAQPage`. Kind: `legal` (reviewedAt required, "vigente a" line). Not medical.
- **Sources**: Ley 5508/2015, Ley 7383/2024, IPS resolution on subsidio, Código del Trabajo. The figures already verified in `lib/derechos.ts` are the source of truth; re-verify before publishing (DECISIONS v5 note).

### P-4 `/tramites/carne-perinatal` — "Carné perinatal en Paraguay: qué es, dónde lo conseguís y qué anotan en cada control"

- **Intent**: informational ("carné perinatal", "carné perinatal Paraguay", "qué es el carné perinatal", "perdí mi carné perinatal").
- **Title** (55): `Carné perinatal en Paraguay: qué es y cómo conseguirlo`
- **Description** (151): `El carné perinatal es tu historia del embarazo en papel: dónde te lo dan (IPS, MSPBS, sanatorio), qué anotan en cada control y qué hacer si lo perdés.`
- **H2s**: Qué es y por qué importa (CLAP/OPS model used in PY) · Dónde te lo dan (IPS, USF/MSPBS, privado) · Qué llevan a cada control (weight, TA, altura uterina, FCF, lab results, vacunas) · Cómo leerlo: los campos que más preguntan · Si lo perdés · Llevalo siempre: por qué el sanatorio lo pide en la urgencia · FAQ (4).
- **App hand-off**: "Sacale una foto a cada página en Mi Bebé: queda en tu teléfono, con tu grupo sanguíneo y alergias a mano en una emergencia. No reemplaza el carné de papel."
- **Schema**: `MedicalWebPage` + `FAQPage`. Reviewer required.
- **Sources**: MSPBS carné perinatal, CLAP/OPS Historia Clínica Perinatal.

### P-5 `/alimentacion/terere-en-el-embarazo` — "¿Se puede tomar tereré en el embarazo? Yerba, yuyos y cafeína, sin mitos"

- **Intent**: informational, very Paraguayan ("tereré embarazo", "se puede tomar tereré embarazada", "yuyos en el embarazo", "mate cocido embarazo").
- **Title** (54): `Tereré en el embarazo: qué dice la evidencia, sin mitos`
- **Description** (149): `Sí, con medida: cuánta cafeína hay en el tereré y el mate cocido, qué yuyos conviene evitar en el embarazo y cómo seguir tomando con el calor paraguayo.`
- **H2s**: La respuesta corta · Cuánta cafeína tiene (yerba vs café vs cocido; the daily ceiling with source) · Los yuyos: cuáles sí, cuáles mejor no (a table; each row sourced) · Mate cocido y cocido con leche · Hidratación y calor: por qué el tereré ayuda · Cuándo preguntarle a tu obstetra · FAQ (4).
- **App hand-off**: "Buscá cualquier comida o bebida en 'Comer' dentro de Mi Bebé — funciona sin conexión."
- **Schema**: `MedicalWebPage` + `FAQPage`. Reviewer required; the yuyos table is the part a reviewer must sign line by line.
- **App has**: guide #2 (short). **Site adds**: the caffeine numbers, the yuyos table, the FAQ; guide #2 in the app gets its canonical to this URL.

---

## 10. Human inputs and open questions

**Only you can provide**

1. Decisions D1–D5.
2. DNS for the root domain and the static host account.
3. The reviewer's name, credential and registry number, and their agreement to sign ~60 site pages in the first pass.
4. Analytics choice and instance.
5. Real screenshots or the go-ahead to generate week renders.

**Parked, not build work**

- Whether the site should ever carry sponsor placements (MVP-AND-MONETISATION §3 says the app's directory sells; the site's price pages are the natural second surface, but only after the reviewer gate and only labelled).
- Whether to register the brand name "Mi Bebé" before the site makes it prominent in search.
- Whether `/nombres` is worth the thin-content risk (Phase 4 note).
