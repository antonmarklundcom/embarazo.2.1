# Google Play submission — what's left, in order

Written 31 October 2026. The app is live as a website/PWA at
`app.embarazo.com.py`. No more app code is needed for a Play launch. What is
left is accounts, forms, a phone test and the Android package. Background and
reasons: `docs/ANDROID-LAUNCH.md`. Building the package: `android/README.md`.

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

**App name** (27/30): `Mi Bebé · Embarazo Paraguay`

**Short description** (72/80):
`Tu embarazo semana a semana, hecho para Paraguay. Funciona sin internet.`

**Full description:**

```
Mi Bebé te acompaña durante todo el embarazo, semana a semana, con información pensada para Paraguay.

TU SEMANA, DE UN VISTAZO
• En qué semana y día estás, cuántos días faltan y cuánto mide tu bebé (en frutas o en centímetros y gramos).
• Qué está pasando esta semana, para vos, para tu pareja y para la familia.
• Un consejo útil por día.

HERRAMIENTAS PARA TU SEGUIMIENTO
• Carné perinatal y preparación de tus controles prenatales.
• Contador de pataditas y de contracciones.
• Síntomas y ánimo, peso, sueño y diario.
• Diario de fotos de tu panza.
• Checklist para el bolso del sanatorio y lo que necesitás de verdad.
• Ejercicios, Kegel y salud dental.
• Nombres para tu bebé, incluidos nombres en guaraní.

HECHO PARA PARAGUAY
• Pantalla de Emergencia con los contactos y señales de alarma a mano.
• Tus derechos durante el embarazo y la maternidad.
• Guías para preparar tus controles, el parto y la llegada del bebé.

EN FAMILIA
• Invitá a tu pareja o a tu familia para que sigan el embarazo con vos. Vos decidís qué ven y podés quitar el acceso cuando quieras.

FUNCIONA SIN INTERNET
Las semanas, la pantalla de emergencia y tus herramientas abren aunque no tengas conexión.

TUS DATOS
Entrás con tu cuenta de Google. Tus registros se sincronizan para que no los pierdas si cambiás de teléfono. Podés exportarlos y pedir el borrado de tu cuenta en cualquier momento.

IMPORTANTE
Mi Bebé ofrece información general y herramientas de registro. No realiza diagnósticos ni reemplaza tus controles prenatales. Ante cualquier señal de alarma, buscá atención médica.
```

**Graphics** (you make these): 512×512 icon (`public/icons/icon-512.png` is the
current one), 1024×500 feature graphic, 4–8 phone screenshots
(`npm run gen:screenshots` is a starting point).

## 6. Submit

Production release → review. Plan for days to a few weeks; health apps and new
accounts get extra checks. After approval, website deploys update the app
automatically. Only a change to the wrapper (icon, name, version) needs a new
`.aab`.

## Optional, not blocking launch

- A Paraguayan gineco-obstetra to review clinical text (also your best
  distribution channel).
- Native-speaker review of the Guaraní strings (`docs/GUARANI-REVIEW.md`), then
  turn on the `guarani` flag.
- Backlog from the 23 October release (`docs/RELEASE-2026-10-23.md`): very
  large accounts can need a sync retry; photo cleanup batches can be starved
  by 20 persistent failures. Neither affects a new launch.
