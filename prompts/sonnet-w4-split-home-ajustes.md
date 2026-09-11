# Unit W4 — split the home page and Ajustes into components. SONNET session. Depends on U11 (merged).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`app/(app)/page.tsx`, `app/(app)/ajustes/**`, `docs/log/u11.md`, the list of e2e specs that visit `/` and `/ajustes`
(`grep -l "goto(\"/\")\|ajustes" e2e/*.spec.ts`). Execute under the autonomy protocol.

Owns: `app/(app)/page.tsx` · `app/(app)/ajustes/**` · `components/home/**` (new) · `components/ajustes/**` (new) ·
`docs/log/w4.md`.

Decision already made: behaviour-preserving extraction only. No new state, no new hooks that change render order,
no copy changes, no restyling. Server/client boundaries stay exactly where they are (a section that was inside a
`"use client"` file stays client; a server-rendered block stays server).

Build:
- Home: one component per visual section already delimited in the file (hero ring + stats, weekly line, shortcuts,
  article feed, popular, companion home, planeando home, recomendados slot, cheers, FAQ…). `page.tsx` becomes the
  data-loading and layout order only; target ≤ 200 lines.
- Ajustes: `AjustesClient.tsx` (1182 lines) → one component per settings group as B4 defined them (cuenta, embarazo
  y fecha, bebé, familia y compartir, notificaciones, idioma, fondo de la semana, privacidad y PIN, datos y copia,
  borrar). Shared state stays in the client shell and is passed down; target ≤ 250 lines for the shell.
- Before touching anything, run every e2e spec that visits `/` or `/ajustes` and save the pass list; after, the same
  list must pass unchanged. Take the one screenshot pass (home + ajustes, 2 widths) before and after and compare by
  eye; a visible diff is a bug.
- `git mv`-style history is not possible for extractions; keep each section's move in its own commit so the diff
  reviews as moves.

Exit: gates green; the saved e2e list green; both target line counts met or the log says why not. Write
`docs/log/w4.md`. Then continue per the run file.
