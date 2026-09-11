# Unit W3 — photo alt text + measured hero contrast. SONNET session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`app/(app)/herramientas/fotos/page.tsx`, `app/(app)/herramientas/carne/page.tsx`, `lib/hero/themes.ts`,
`lib/hero/themes.test.ts`, `components/hero/ThemeBackdrop.tsx`, `docs/log/u7.md` "Known issues". Execute under the
autonomy protocol.

Owns: the two page files (the `<img>` `alt` attributes and the date formatting they need, nothing else) ·
`lib/hero/contrast.ts` + `.test.ts` (new) · `lib/hero/themes.test.ts` (extend) · `docs/log/w3.md`.

Build:
- Alt text in es-PY voseo from data the row already has: "Foto de tu panza, semana 24, 3 de septiembre" and
  "Página 2 de tu carné perinatal, 3 de septiembre". No new fields; format dates with the helper the page already
  uses for its captions.
- `lib/hero/contrast.ts`: pure WCAG 2.x relative luminance + contrast ratio over hex/rgb strings (≤ 40 lines,
  unit-tested against the known pairs: black/white 21:1, #777/#fff 4.48:1).
- `themes.test.ts`: for every theme, the actual text colour its `ink` (`"dark" | "light"`) resolves to in
  `ThemeBackdrop`/`globals.css` (read the token value from the CSS as text, do not hardcode it) over its `scrim`
  colour reaches ≥ 4.5:1; if the scrim carries alpha, composite it over the theme's base gradient stop first. Where a theme fails,
  adjust the scrim opacity or ink in `lib/hero/themes.ts` — that file is outside your Owns block, so the change is
  limited to the failing value and is named in the log; if more than two themes fail, stop per §4.5 and write it
  to `docs/decisions-needed.md` instead.
- Run `e2e/week-hero.spec.ts` and the two tool specs that cover fotos/carné (`grep -l fotos e2e/*.spec.ts`).

Exit: gates green; the named e2e green; no theme below 4.5:1 by the test. Write `docs/log/w3.md`. Then continue per
the run file.
