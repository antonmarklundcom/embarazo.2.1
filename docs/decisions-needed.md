# Decisions needed

Wishes that could not be actioned inside the unit that found them, because the
file they need is outside that unit's list. One line each, with the unit that
raised it. A struck entry is one a later commit resolved; it stays, with the
resolution, so the reasoning is not lost.

## for the medical reviewer

- **Daily tips t-32 … t-103 (growth plan item 10, 2026-09-27).** 72 tips added
  to `lib/dailyTips.ts`, written as general clinical education (no doses, no
  "wait and see"; ranges copied from the week and trimester content: pataditas
  16–24 semanas, glucosa 24–28, tamizaje 11–14, prematuro antes de 37). They
  render today on Hoy, one a day, like t-01 … t-31. Worth a line-by-line read:
  t-35 (vacunas según el calendario vigente), t-40 (queso casero sin
  pasteurizar), t-42 (cinturón de seguridad), t-61 (jengibre para las náuseas),
  t-82 (ejercicio: ritmo en el que puedas conversar), t-92 (signos de
  preeclampsia), t-100 (lactancia). Fix any line in place; `lib/dailyTips.test.ts` keeps the rules.

- **"Ya nació" baby home copy (growth plan item 9, G2, 2026-09-28).** `lib/baby/content.ts`:
  feeding (exclusive breastfeeding to 6 months per WHO, then complementary food, no honey
  before one year), safe sleep (on the back, firm flat surface, own cot in the parents' room,
  no smoke), and seven alarm signs in a baby, each linking to `/emergencia` (fever, especially
  under 3 months; breathing difficulty; not feeding; very drowsy; jaundice in the first days;
  convulsions; few wet nappies / diarrhoea / red umbilical stump). Live on Hoy once a birth
  date is recorded. The vaccine card names no vaccine and no age on purpose: it waits for a
  **sourced PAI 0–12 month calendar** (MSPBS), which is a separate input Anton has to supply.

## answered

- **App name (U8):** `Mi Bebé · Embarazo Paraguay`. Confirmed by Anton 2026-09-16.
- **App URL / domain (B1):** `app.embarazo.com.py`, a subdomain of the
  content site (`embarazo.com.py`). Proposed by Anton 2026-09-16; used as
  the working assumption for Resend's sending domain and the eventual
  Hostinger deploy. Flag if this changes before deploy.

## for the link pass

- ~~W3: 5 of 6 hero themes (`halo`, `nanduti`, `cielo`, `estevia`, `alas`) measurably fail WCAG AA
  for the caption over their scrim (`lib/hero/themes.test.ts`; `cielo` fails even the 3:1 large-text
  bar) — the scrim opacity in `lib/hero/themes.ts` is too low for these pastel backgrounds. W3's
  dispatch forbids changing theme colour values, so this needs someone with that file in scope to
  raise scrim opacity (or darken `ink`) for those five themes.~~ **Fixed**: scrim opacity raised for
  all five in `lib/hero/themes.ts` (background hues untouched); all six themes now measure ≥4.6:1
  for body ink and ≥5.4:1 for large ink. See `docs/log/w3.md` addendum for the per-theme ratios.

- **W4 — finish the PIN card extraction.** `lib/pinPolicy.test.ts` (K18) reads
  `app/(app)/ajustes/AjustesClient.tsx` **by path** and asserts the floor comes
  from `MIN_PIN_LENGTH` rather than a copied literal, plus two copy assertions
  ("no se recuperan", "probando todas las combinaciones"). W4 split every other
  settings card into `components/ajustes/**`; the PIN card stayed behind only so
  that guardrail keeps pointing at real code. Repoint the three assertions at
  `components/ajustes/PinSettings.tsx`, then move the card there — it is ~60
  lines and would take the shell from 274 to ~214.
