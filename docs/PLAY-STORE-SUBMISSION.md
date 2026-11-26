# Google Play submission — what's left, in order

Written 31 October 2026. The app is live as a website/PWA at
`app.embarazo.com.py`. No more app code is needed for a Play launch. What is
left is accounts, forms, a phone test and the Android package. Background and
reasons: `docs/ANDROID-LAUNCH.md`. Building the package: `android/README.md`.

**Updated 26 November 2026:** §5 (store listing) was checked line by line
against the app and rewritten, the eight listing screenshots are in
`android/store-listing/screenshots/`, and the owner's open items are in one
list at the end ("Still needed from the owner").

## 1. Before Play (website housekeeping)

| # | Task | Who | Done when |
|---|---|---|---|
| 1.1 | Make `hola@embarazo.com.py` receive mail (Cloudflare route), **or** set `NEXT_PUBLIC_SUPPORT_EMAIL=soporte@embarazo.com.py` in Hostinger | You | A test email to that address reaches you |
| 1.2 | Confirm Hostinger backs up the app's MySQL database; keep one export somewhere else | You | You can name where the backup is |
| 1.3 | Sign-up / password-reset mail lands in Inbox, not Spam | You | One real test |
| 1.4 | Phone test: install from Chrome, sign in, Ajustes → Avisos → *Probar con la app cerrada* | You | The test notice arrives with the app closed |

## 2. Publisher identity (the slow part, start now)

| # | Task | Notes |
|---|---|---|
| 2.1 | Pick the publisher: your Paraguayan RUC holder or the Swedish AB | Health apps need a Play **organization** account, which needs a D-U-N-S number |
| 2.2 | Get a D-U-N-S number for that entity | Free from Dun & Bradstreet, up to ~30 days. Confirm D&B accepts a *persona física* RUC before relying on it; a registered business (unipersonal, EAS, S.A.) is the safe route. The AB may already have one |
| 2.3 | Register a Play Console organization account (US$25) and finish verification | Legal name, address, phone and email must match the D-U-N-S record |
| 2.4 | Put the same legal name in the app | Set in Hostinger, then let it rebuild: `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`, `NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY`, optional `NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID` (e.g. `RUC 1234567-8`). It shows on `/privacidad` and `/terminos`. With none set, the pages keep naming the Swedish AB |
| 2.5 | Legal text | `/terminos` says *pendientes de revisión legal* and `/privacidad` ends with a note that the operator must confirm details before Play. Have them reviewed for the chosen entity, then remove those notes |

## 3. Package and test

| # | Task | Notes |
|---|---|---|
| 3.1 | Build the `.aab` with Bubblewrap from `android/twa-manifest.json` | `android/README.md`. Confirm `targetSdkVersion` ≥ 36 |
| 3.2 | Back up the keystore and passwords | Password manager + offline copy. Never in git |
| 3.3 | Upload to **Internal testing** | Up to 100 testers, no review wait |
| 3.4 | Set `TWA_PACKAGE_NAME` and `TWA_SHA256_FINGERPRINTS` (upload key **and** Play signing key) in Hostinger | Check `https://app.embarazo.com.py/.well-known/assetlinks.json` |
| 3.5 | Install from the internal-test link on a real phone | No URL bar at the top; sign in works; notifications work; offline week pages open |

## 4. Play Console forms

| Form | Answer |
|---|---|
| App access | "Some functionality is restricted" — give a dedicated Google test account (2-step verification off) that only Play reviewers use. Note that week pages, guías, emergencia, privacidad and borrar-cuenta work without signing in |
| Ads | No (until sponsored listings go live with paying partners) |
| Content rating (IARC) | Reference/health content, no user-generated content, no gambling |
| Target audience | 18+ only. Do not tick any child age band |
| Health apps declaration | Pregnancy tracking / wellness, not a medical device, no diagnosis |
| Data safety | Use the table in `docs/ANDROID-LAUNCH.md` §3.1 row by row. Yes to: name/email/user ID, health info, approximate location (department/city), app interactions, user-entered contacts; photos only if photo backup is on in production. Encrypted in transit: yes. Users can request deletion: yes |
| Account deletion URL | `https://app.embarazo.com.py/borrar-cuenta` |
| Privacy policy URL | `https://app.embarazo.com.py/privacidad` |
| Government / financial / news | No |

## 5. Store listing (ready to paste, es-419 / Spanish)

> **Checked against the app on 26 November 2026** (branch `feat/play-listing`,
> after the shorter Hoy, "Para conversar", the checklist by trimester and the
> family line). Every line below is something a normal user can open today:
> nothing behind a flag that is off, nothing that waits on unpublished content
> (food lookup, prices, videos, directory, the AI baby picture, Guaraní, the
> daily question), and no claim of medical review, because no reviewer is
> recorded yet (`lib/seed/approvals.json` and `lib/seed/reviewers.json` are
> empty). If one of those turns on later, add its line then, not before.
> What changed from the 31 October text is listed under the description.

**App name** (27/30): `Mi Bebé · Embarazo Paraguay`

This is the name in `lib/brand.ts`, `app/manifest.webmanifest` and
`android/twa-manifest.json`. `docs/LAUNCH-CHECKLIST.md` 1.2 and
`docs/ANDROID-LAUNCH.md` §4 still show it as `Mi Bebé — Embarazo Paraguay`
(dash instead of the middle dot) and ask for a Play-search and trademark check
before committing. The owner decides; the files are not changed here.

**Short description** (72/80):
`Tu embarazo semana a semana, hecho para Paraguay. Funciona sin internet.`

**Full description** (2382/4,000 characters):

```
Mi Bebé te acompaña durante todo el embarazo, semana a semana, con información pensada para Paraguay.

HOY, DE UN VISTAZO
• En qué semana y día estás, cuántos días faltan y cuánto mide tu bebé (en frutas o en centímetros y gramos).
• Debajo, solo lo de hoy: tu próximo control, un consejo del día y cómo te sentís.
• Lo demás está ordenado en filas que se abren con un toque: tu semana, herramientas, acompañada, en Paraguay y más.

TU SEMANA
• Qué está pasando esta semana, para vos, para tu pareja o quien te acompaña, y para la familia.
• Cada semana, una línea para la abuela, la tía o la madrina: cómo pueden darte una mano.

HERRAMIENTAS PARA TU SEGUIMIENTO
• Carné perinatal y preparación de tus controles prenatales.
• Contador de pataditas y de contracciones.
• Síntomas y ánimo, peso, sueño y diario.
• Diario de fotos de tu panza.
• Checklist del bolso para el parto y de los trámites después del nacimiento.
• Checklist por trimestre: lo que cada semana te propone hacer, juntado en un solo lugar.
• Para conversar: preguntas para charlar con tu pareja o con quien te acompaña antes de que llegue el bebé.
• Ejercicios suaves, Kegel y salud dental.
• Nombres para tu bebé, incluidos nombres en guaraní.

HECHO PARA PARAGUAY
• Pantalla de Emergencia con números, señales de alarma y tus contactos a mano.
• Tus derechos durante el embarazo y la maternidad.
• Guías sobre el control prenatal, las vacunas, las señales de alarma, el bolso para el sanatorio y los trámites después del nacimiento.

EN FAMILIA
• Invitá a tu pareja o a tu familia para que sigan el embarazo con vos. Vos decidís qué ven y podés quitar el acceso cuando quieras.

CUANDO NACE TU BEBÉ
• Anotás el día del nacimiento y la app pasa a contar la edad de tu bebé. Las semanas del embarazo quedan para recordar.

FUNCIONA SIN INTERNET
Las semanas, las guías, la pantalla de Emergencia y las herramientas principales abren sin conexión, una vez que entraste a tu cuenta en el teléfono.

TUS DATOS
Entrás con tu cuenta de Google o con tu correo y una contraseña. Tus registros se sincronizan para que no los pierdas si cambiás de teléfono. Podés exportarlos y pedir el borrado de tu cuenta en cualquier momento.

IMPORTANTE
Mi Bebé ofrece información general y herramientas de registro. No realiza diagnósticos ni reemplaza tus controles prenatales. Ante cualquier señal de alarma, buscá atención médica.
```

Changed from the 31 October text, and why:

- "TU SEMANA, DE UN VISTAZO" became "HOY, DE UN VISTAZO" with two new lines:
  Hoy now shows only the hero, "Hoy" (next control, tip, mood) and rows that
  open on tap.
- "Un consejo útil por día" moved into the Hoy line ("un consejo del día").
- "para tu pareja" became "para tu pareja o quien te acompaña": the app's own
  wording since the neutral partner change.
- New: the weekly line for la abuela, la tía, la madrina (42 published lines).
- "Checklist para el bolso del sanatorio y lo que necesitás de verdad": the app
  has no "what you really need" list. Now it names the two lists that exist
  (bolso para el parto, trámites) and the new view by trimester.
- New: "Para conversar" (36 published cards).
- "Ejercicios" became "Ejercicios suaves": 12 published, each step with photos.
- Emergencia: "contactos y señales de alarma" became "números, señales de
  alarma y tus contactos", which is what the screen shows.
- "Guías para preparar tus controles, el parto y la llegada del bebé" now names
  the topics of the eight published guides.
- New: "CUANDO NACE TU BEBÉ" (baby mode: the age of the baby, weeks as a
  look-back).
- Offline: "tus herramientas" became "las herramientas principales", and the
  line now says it works once she has signed in on that phone. Not every tool
  is precached (`app/sw.ts`), and offline the app admits only a device whose
  account it has verified (`components/AccountEntryGate.tsx`).
- Sign-in: "con tu cuenta de Google" became "con tu cuenta de Google o con tu
  correo y una contraseña": email and password is on wherever accounts are
  (`lib/auth/config.ts`, `isAuthConfigured`).

**What's new** (release notes, first release, 42/500):
`Primera versión de Mi Bebé en Google Play.`

**Category:** `[COMPLETAR]`. The owner picks one Play category. The web
manifest lists `health`, `lifestyle`, `medical`; Play's candidates are
*Medical*, *Health & Fitness* and *Parenting*. The health apps declaration
(§4) applies whichever is chosen.

**Contact details:**

| Field | Value |
|---|---|
| Email (required, public) | `[COMPLETAR]`: the monitored address from §1.1 (`hola@embarazo.com.py` or `soporte@embarazo.com.py`), the same one set as `NEXT_PUBLIC_SUPPORT_EMAIL` |
| Website | `https://app.embarazo.com.py` |
| Phone (optional) | `[COMPLETAR]` or leave empty |
| Privacy policy | `https://app.embarazo.com.py/privacidad` (lawyer's version first, §2.5) |

**Graphics:**

| Asset | Where | State |
|---|---|---|
| App icon 512×512 | `public/icons/icon-512.png` | Exists; `docs/ANDROID-LAUNCH.md` §4 calls it a placeholder not good enough to launch on. Owner/design item |
| Feature graphic 1024×500 | none | **Not made.** The repo has no source or generator for it (`scripts/gen-og.mjs` makes a 1200×630 placeholder share image, not this). Owner/design item |
| Phone screenshots, 8 | `android/store-listing/screenshots/01-hoy.png` … `08-emergencia.png` | Ready. 1080×1920 (9:16), each under 500 KB, real app, no captions or frames |

The screenshots, in upload order: Hoy (top), the "Hoy" block, week 24, the
tools grid, "Para conversar", the hospital-bag checklist, `/derechos`,
`/emergencia`. Seeded as a fresh phone: Mamá at 23+3 weeks, a next control in
five days, today's mood, three bag items ticked, no name typed. Regenerate
after a visible change with `npm run build` then `npm run
gen:play-screenshots` (port 3211, starts and stops its own server). The two
photo-heavy shots are re-encoded as 256-colour PNG to stay under 500 KB.
Play's rule: the pictures must show the real app and carry no "best" or
"number 1" claims, so do not add captions that say so.

The install-sheet screenshots in `public/screenshots/` (web manifest) are a
different set: `npm run gen:screenshots`.

## 6. Submit

Production release → review. Plan for days to a few weeks; health apps and new
accounts get extra checks. After approval, website deploys update the app
automatically. Only a change to the wrapper (icon, name, version) needs a new
`.aab`.

## Still needed from the owner (26 November 2026)

Nothing below can be done from the repo.

1. **Publisher identity:** the organisation that publishes (§2.1), its
   D-U-N-S number (§2.2) and the Play Console organisation account (§2.3).
2. **Signing key and fingerprints:** create and back up `android.keystore`
   (§3.2), then set `TWA_SHA256_FINGERPRINTS` with the upload key and the Play
   signing key (§3.4).
3. **Content rating (IARC):** fill in the questionnaire (§4,
   `docs/LAUNCH-CHECKLIST.md` 3.3).
4. **Health apps declaration** (§4, `docs/LAUNCH-CHECKLIST.md` 3.4).
5. **Privacy policy URL:** `/privacidad` reviewed by a lawyer for the chosen
   entity, the draft note removed (§2.5).
6. **Support e-mail:** a monitored address, set as `NEXT_PUBLIC_SUPPORT_EMAIL`
   and used as the listing's contact e-mail (§1.1).
7. **App name:** confirm `Mi Bebé · Embarazo Paraguay` after the Play-search
   and trademark check (`docs/LAUNCH-CHECKLIST.md` 1.2).
8. **Play category** (§5, `[COMPLETAR]`).
9. **Feature graphic 1024×500** and a launch-quality **512×512 icon** (§5,
   design items).
10. **Optional phone number** for the listing (§5, `[COMPLETAR]`).
11. **Prove the offline claim on a real phone before pasting the listing.** The
    short description says "Funciona sin internet". Offline reading is built,
    but it has not been confirmed on a signed-in Android phone (see `STATUS.md`,
    "Needs Anton": sign in, open Hoy, a week and pataditas, switch to airplane
    mode, open them again). If that test fails, change the short description
    before submitting.

## Optional, not blocking launch

- A Paraguayan gineco-obstetra to review clinical text (also your best
  distribution channel).
- Native-speaker review of the Guaraní strings (`docs/GUARANI-REVIEW.md`), then
  turn on the `guarani` flag.
- Backlog from the 23 October release (`docs/RELEASE-2026-10-23.md`): very
  large accounts can need a sync retry; photo cleanup batches can be starved
  by 20 persistent failures. Neither affects a new launch.
