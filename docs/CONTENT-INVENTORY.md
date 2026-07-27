# Innehållsinventarium — allt som behöver produceras

Komplett lista över text, guider, bilder och video appen behöver. Sorterad
efter vad som blockerar vad, inte efter storlek.

**Statuskolumnen** säger vad koden gör medan innehållet saknas — inget här
kraschar appen, allt har ett vettigt tomt läge.

Formatet för varje post finns i `docs/CONTENT-GUIDE.md`.
Färdiga prompter finns i `docs/GEMINI-PROMPTS.md` (fungerar i Gemini 3.6
Flash Extended eller vilken modell som helst).

---

## 1. Text och innehåll

### 1.1 Veckofraser — 42 st · `content/week-notes.json`
| | |
|---|---|
| **Vad** | En mening per vecka om vad som händer just nu |
| **Prompt** | GEMINI-PROMPTS.md §3 — allt i en körning |
| **Status utan** | Hemskärmen visar dagstipset istället, inget hål |
| **Prioritet** | **Hög** — syns på förstaskärmen, billigast att göra |

### 1.2 Guías — 8 klara, 18 kvar · `content/articles.json`
Redan skrivna: dengue · tereré/koffein · vad man tar med till sanatoriet ·
trámites efter födseln · IPS vs privat · varningstecken · PAI-vacciner ·
arbetsrätt.

Kvar att skriva, i prioritetsordning (prompt: GEMINI-PROMPTS.md §1, kör 6 åt
gången):

| # | Ämne | Kluster |
|---|---|---|
| 1 | Mat i graviditeten med paraguayansk kost | `alimentacion` |
| 2 | Anemi och järn | `salud` |
| 3 | Preeklampsi / högt blodtryck | `salud` |
| 4 | Graviditetsdiabetes och sockerkurvan | `salud` |
| 5 | Vaginal förlossning vs kejsarsnitt i Paraguay | `parto` |
| 6 | Amning: första dagarna, tagget, myter | `postparto` |
| 7 | Psykisk hälsa: ångest och depression | `bienestar` |
| 8 | Sex under graviditeten | `bienestar` |
| 9 | Ultraljud: vilka, när, vad kostar de | `logistica` |
| 10 | Tonårsgraviditet: rättigheter och stöd | `derechos` |
| 11 | Våld under graviditet — Línea 137 | `derechos` |
| 12 | Toxoplasmos, chagas, lokala infektioner | `salud` |
| 13 | Vanliga läkemedel: vad går att ta | `salud` |
| 14 | Puerperiet: de första 40 dagarna | `postparto` |
| 15 | IPS steg för steg (ansluta bebisen, subsidio) | `tramites` |
| 16 | Förbereda syskonen och familjen | `bienestar` |
| 17 | Extrem värme och graviditet | `salud` |
| 18 | Yuyos och huskurer: vilka undvika | `alimentacion` |

**Status utan:** de 8 befintliga visas, resten saknas bara.
**Prioritet:** medel — men det är innehållsvallgraven på sikt.

### 1.3 Matuppslagsverket — ~40 poster · `content/food.json`
| | |
|---|---|
| **Vad** | "¿Puedo comer esto?" med si/cuidado/evitar + skäl |
| **Prompt** | GEMINI-PROMPTS.md §2 — en körning för mat, en för yuyos |
| **Status utan** | Verktyget finns inte förrän D3 byggs; datan kan ligga före |
| **Prioritet** | **Hög** — ingen global app har paraguayansk mat på es-PY |

⚠️ Publiceras **inte** förrän `reviewedBy` är ifyllt. Du kan generera allt
idag utan risk.

### 1.4 Katalog — 30–50 poster · `content/directory.json`
| | |
|---|---|
| **Vad** | Sanatorios, obstetras, ecografías, farmacias i Asunción + Central |
| **Prompt** | GEMINI-PROMPTS.md §4 ger bara en **ringlista** |
| **Status utan** | Fliken visar "estamos armando el directorio" + WhatsApp-knapp |
| **Prioritet** | **Hög** — det är produkten, inte en detalj |

⚠️ Får inte genereras. `consentedAt` är obligatoriskt: varje företag måste ha
sagt ja. Räkna med ett samtal per post.

### 1.5 Event · `content/events.json`
Fliken visar tomt läge tills det finns riktiga. Ett eget gratis-föredrag med
din läkargranskare är både innehåll och marknadsföring.
**Prioritet:** låg före lansering.

### 1.6 Guaraní-granskning — befintliga strängar
Varningstecknen i `lib/emergency.ts` har jopara-utkast som **aldrig granskats
av en modersmålstalare**. De visas idag på akutskärmen.
**Prioritet:** **hög** — det är säkerhetskritisk text.
Detta är inte en Gemini-uppgift. Det behöver en person.

### 1.7 Juridisk verifiering — befintliga siffror
`lib/derechos.ts` anger exakta tal (18 semanas, 100 % subsidio, 4 h enligt Ley
7383/2024, fuero 1 år). Måste bekräftas av arbetsrättsjurist före lansering,
och sedan var 6:e månad.

### 1.8 Integritetspolicy och villkor
Omskrivna för kontovärlden, men **utkast**. Kräver jurist innan riktiga
användare loggar in.

---

## 2. Bilder

Alla har fallback i koden — saknas en fil visas ett format med veckonummer i
sand-ton. Konventionen står i `public/assets/README.md`.

### 2.1 Veckobilder — 39 st · `public/assets/semanas/bebe-<vecka>.webp`
Vecka 4 till 42. Används på hemskärmens hjälte och på varje veckosida.
**Prioritet:** **hög** — de bär hela känslan på förstaskärmen.
Detta kan jag batch-generera via Higgsfield i en session om du vill ha en
sammanhållen serie. Säg till.

### 2.2 Artikelbilder — 1 per guía · `public/assets/articulos/<slug>.webp`
26 stycken när alla guías finns. Låg prioritet — korten fungerar utan.

### 2.3 Livsstilsfoton — 3–5 st · `public/assets/hero/`
Till landningssidan `/conoce` och delningskort. Måste vara paraguayanska
ansikten och miljöer, inte generisk stockfotografi — det är halva
trovärdigheten.

### 2.4 Riktig logotyp och ikoner
Nuvarande PWA-ikoner är genererad platshållarkonst
(`scripts/gen-icons.mjs`). Behövs: en riktig logotyp, sedan kör jag om
ikonerna, OG-bilden och manifest-skärmbilderna.
**Prioritet:** medel — men det är det första någon ser på hemskärmen.

### 2.5 Skärmbilder till manifestet
Genereras automatiskt med `npm run gen:screenshots` när designen känns klar.
Ingen manuell insats.

---

## 3. Video

### 3.1 Kuraterade videor — 8–12 st · `content/videos.json`
| | |
|---|---|
| **Prompt** | GEMINI-PROMPTS.md §5 ger sökord och kanalförslag |
| **Status utan** | Galleriet och dess två ingångar döljer sig helt |
| **Prioritet** | låg — appen är komplett utan dem |

⚠️ Video-id:n får inte genereras. Hämta de 11 tecknen från YouTube själv och
kontrollera att inbäddning är tillåten. Källor att föredra: MSPBS Paraguay,
OPS/OMS, universitetssjukhus, gynekologföreningar.

### 3.2 Träningsklasser (D6, senare)
Egen produktion. Korta, nedladdningsbara, utan utrustning. Inte före
lansering.

---

## 4. Personer du behöver

| Roll | Varför | Blockerar |
|---|---|---|
| **Gineco-obstetra** | Granskar 42 veckor, alla guías, varningstecken, matdatabasen. Namnet blir din trovärdighet i `NEXT_PUBLIC_MEDICAL_REVIEWER` | Bylines, matuppslagsverket, hela lanseringen |
| **Guaraní-talare** | Granskar och utökar jopara-strängarna | Akutskärmen |
| **Arbetsrättsjurist** | Verifierar derechos-siffrorna | `/derechos` |
| **Jurist för dataskydd** | Policy och villkor för kontovärlden | Inloggning för riktiga användare |

---

## 5. Ordning jag skulle ta det i

**Vecka 1 — helt utan att prata med någon**
1. Veckofraserna (42) — en Gemini-körning
2. Matdatabasen (~40) — två körningar
3. Guías 1–6 — en körning

**Vecka 2 — börja ringa**
4. Ringlistan från Gemini, sedan 30–50 samtal för katalogen
5. Rekrytera läkargranskaren — allt annat väntar på henne
6. Guías 7–12

**Vecka 3**
7. Guaraní-granskare
8. Jurist på derechos + policy
9. Guías 13–18
10. Logotyp

**Löpande:** veckobilderna (jag kan generera), artikelbilder, videor, event.

---

## 6. Vad koden gör medan allt detta saknas

Inget är trasigt. Varje yta har ett ärligt tomt läge:

- Katalog och event: "estamos armando…" med WhatsApp-knapp
- Videogalleriet: döljer sig, inklusive sina två navigeringsingångar
- Bilder: sand-tonad fallback med veckonumret
- Granskningsraden: renderas inte alls utan riktig granskare
- Matverktyget: publicerar bara granskade poster

Det betyder att du kan lansera testrundan med vänner **innan** något av
detta är klart, och fylla på efterhand.
