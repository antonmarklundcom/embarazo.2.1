# Decisions needed

Wishes that could not be actioned inside the unit that found them, because the
file they need is outside that unit's list. One line each, with the unit that
raised it. A struck entry is one a later commit resolved; it stays, with the
resolution, so the reasoning is not lost.

## answered

- **App name (U8):** `Mi Bebé · Embarazo Paraguay`. Confirmed by Anton 2026-09-16.

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
