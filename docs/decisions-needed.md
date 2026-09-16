# Decisions needed

## for the link pass
- W3: 5 of 6 hero themes (`halo`, `nanduti`, `cielo`, `estevia`, `alas`) measurably fail WCAG AA
  for the caption over their scrim (`lib/hero/themes.test.ts`; `cielo` fails even the 3:1 large-text
  bar) — the scrim opacity in `lib/hero/themes.ts` is too low for these pastel backgrounds. W3's
  dispatch forbids changing theme colour values, so this needs someone with that file in scope to
  raise scrim opacity (or darken `ink`) for those five themes.
