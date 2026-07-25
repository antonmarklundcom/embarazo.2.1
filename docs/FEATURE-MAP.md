# Feature map — Preggers benchmark → Mi Bebé

> July 2026. The founder reviewed 16 screens of the Swedish app **Preggers**
> and approved **all 31 items** below for the roadmap, with three
> amendments (see "Founder decisions"). This file is the traceability
> table: item → what we build → which BUILD-PLAN task owns it.
>
> **We take structure, information architecture and feature ideas. We take
> none of their visuals, art or copy.** The pastel/cream Mi Bebé language
> in `docs/REDESIGN-PLAN.md` §1 is unchanged.

## Founder decisions (July 2026)

| # | Decision |
|---|---|
| 1 | **Build all 31 items.** |
| 2 | **Keep the pastel/cream palette** — Preggers' dark navy + hot pink is not adopted. |
| 3 | **Accounts ARE wanted**, with Google and Facebook sign-in. This reverses the original "no accounts ever" contract — see ARCHITECTURE.md §4. |
| 4 | **No pop-up ads over content** (no sponsors yet, and they damage trust in a health app). The Deals/`Beneficios` surface is still built, as a browsable tab only. |
| 5 | **The AI baby image IS wanted** — the app's purpose is joy and engagement, not only clinical seriousness. It ships as a clearly-labelled entertainment feature, walled off from medical content (ARCHITECTURE.md §9). |

## A. Onboarding & settings

| # | Item | What we build | PY adaptation | Task |
|---|---|---|---|---|
| 1 | Relationship role | `mamá / papá / acompañante / familiar o amiga` chosen in onboarding; drives tone + which home content shows | Fathers are commonly present but never addressed by global apps — this is cheap differentiation | B1 |
| 2 | Baby nickname | Name the baby; all copy becomes personal ("Silvia ya mide…") | — | B2 |
| 3 | Twins | Data model supports ≥2 babies from day one so no migration later; UI in a later phase | — | B2 |
| 4 | Due-date calculation methods | LMP · ecografía · FIV · known conception date | **Ecografía dating is a first-class option, not a special case** — many women only know what the ultrasound said | B3 |
| 5 | Pregnancy length + week display | Adjustable length (default 280 d); show week as `24` or `24+3` | **`week+day` is our default** — that is how the carné perinatal is written | B3 |
| 6 | Planned delivery date | Separate from the estimated due date | High planned-cesárea rate makes this common | B3 |
| 7 | Granular notification prefs | Separate toggles for consejos / recordatorios / avisos de comercios | No email channel — push only | B5 |
| 8 | Never ask for notification permission on load | Permission requested only from the settings toggle | — | B5 |

## B. Home screen ("Hoy")

| # | Item | What we build | PY adaptation | Task |
|---|---|---|---|---|
| 9 | Circular week hero + progress ring | Round baby image with a progress ring, replacing the flat hero card | Uses our own week renders | C1 |
| 10 | Week / days passed / days left | Three-stat row under the hero | "Faltan 116 días" is the number people want | C1 |
| 11 | One concrete sentence per week | A single "what is happening right now" line per week (42 strings) | Written es-PY, medically reviewed | C2 |
| 12 | Size comparison with tabs | Tabs: tamaño del bebé / pie / mano | Keep local comparisons (mamón, palta, choclo) + cm/g | C3 |
| 13 | Perspective switcher | Same week, three entrances: para vos / para tu pareja / para la familia | Combined with #1 this is our family feature | C4 |
| 14 | "From the midwife" | One featured expert article per week, bylined | `De la obstetra` — tied to the medical reviewer; this is the B4 credibility fix | C5 |
| 15 | Week-linked article feed | "Recomendado para la semana 24" from the article corpus | — | C6 |
| 16 | Popular content this week | Anonymous aggregate counters, no user id | — | C7 |
| 17 | Read-time label | "2 min" on every article card | — | C6 |
| 18 | Shortcuts card | High-placement quick actions | Ours: emergencia + carné + próximo control | C8 |
| 19 | In-app rating prompt | "¿Cómo te está yendo?" | During testing it routes to **WhatsApp feedback**, not a store rating (we are a PWA) | C8 |

## C. Tools & content

| # | Item | What we build | PY adaptation | Task |
|---|---|---|---|---|
| 20 | Illustrated tools grid | 3-per-row grid with real illustrations replacing the text list | — | D1 |
| 21 | Missing tools | Kegel, name picker, dental health, diary, sleep | **Name picker carries Paraguayan/Spanish + Guaraní names** (Arami, Yasy, Ñasaindy) — a sharing magnet no global app has | D2 |
| 22 | Training classes | Filtered by stage, with duration + equipment | Must be short, downloadable, `sin equipo` — data is expensive | D6 |
| 23 | Food lookup ("¿puedo comer…?") | Searchable safe/unsafe food database | **Highest-value single content asset**: tereré, mate, carne asada, chorizo, quesú Paraguay, pescado de río (mercury), mandioca, chipa, yuyos | D3 |
| 24 | Checklist as its own tab | Promote checklists out of the tools drawer | — | D4 |
| 25 | Price guide / product comparison | Not a price comparator | **No Prisjakt equivalent exists in PY.** Rebuilt as "qué necesitás de verdad" with realistic ₲ ranges and where to buy in Asunción | E5 |
| 26 | Category banners with counts | Image banner + count per category | Applied to the directory: "Sanatorios · 24 lugares" | D5 |

## D. Growth, sharing & monetisation

| # | Item | What we build | PY adaptation | Task |
|---|---|---|---|---|
| 27 | Deals as their own tab | `Beneficios` tab, browsable only — **no pop-ups** (founder decision 4) | Local farmacias / tiendas de bebé; hidden until real partners exist | E4 |
| 28 | Price ladder with per-week framing | Not built now (app is free) — but the payments surface is designed so it can be added | **Cards work poorly in PY**: any future paid tier must be Tigo Money / Personal / bank transfer, not card-first | — (noted) |
| 29 | FAQ inside sensitive flows | Accordion FAQ | Used for the **privacy + account questions** ("¿quién ve mis datos?"), which is our equivalent trust moment | E6 |
| 30 | Share from the week hero + bump frame | Web Share + a canvas-rendered week/bump card | WhatsApp-first; family groups are the growth channel | E2 |
| 31 | Invite / feedback card in the flow | "Invitá a una amiga" sharing the install link | Also the feedback path during the friends-and-family test | E3 |

## Explicitly not copied

- Pop-up ads over content, and the recurring "tag @preggers.app" banner (founder decision 4).
- "By continuing you agree… cookies are used for ads personalisation" — we ask for consent explicitly instead (ARCHITECTURE.md §8).
- The photoreal fetus imagery — our warmer illustrations are cheaper and less charged.
- Their palette, art and copy.
