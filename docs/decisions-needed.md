# Decisions needed

## for the link pass
- ~~W3: 5 of 6 hero themes (`halo`, `nanduti`, `cielo`, `estevia`, `alas`) measurably fail WCAG AA
  for the caption over their scrim (`lib/hero/themes.test.ts`; `cielo` fails even the 3:1 large-text
  bar) — the scrim opacity in `lib/hero/themes.ts` is too low for these pastel backgrounds. W3's
  dispatch forbids changing theme colour values, so this needs someone with that file in scope to
  raise scrim opacity (or darken `ink`) for those five themes.~~ **Fixed**: scrim opacity raised for
  all five in `lib/hero/themes.ts` (background hues untouched); all six themes now measure ≥4.6:1
  for body ink and ≥5.4:1 for large ink. See `docs/log/w3.md` addendum for the per-theme ratios.
