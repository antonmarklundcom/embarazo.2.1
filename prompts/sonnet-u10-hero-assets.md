# Unit U10 — hero + comparison asset drop. SONNET session. Depends on U7 (merged) and the founder's renders.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §4 and §8, `docs/log/u7.md`, `public/assets/semanas/README.md`,
`lib/seed/comparisons.json`, `lib/server/contentDebt.ts`, `scripts/optimize-images.mjs`. Load the
`webimg-pipeline` skill only if the founder's files are not already on a branch in this repo. Execute under the
autonomy protocol (§4).

Owns: `public/assets/semanas/**` · `public/assets/comparaciones/**` · `lib/seed/comparisons.json` (fill
`imageSrc`/`itemCm` gaps) · `lib/server/contentDebt.ts` (append one row: missing comparison images) · `docs/log/u10.md`.

Build:
- Find the founder's transparent PNGs (branch named in `docs/decisions-needed.md` or the `src/` folders). Run
  `npm run optimize:images`; verify the output WebPs keep alpha (`sharp` metadata `hasAlpha: true` for a sample)
  and each is ≤ 120 kB; delete nothing from `src/` (git-ignored per the README; if it is not, add it).
- Check every `bebe-<week>.webp` for weeks 3–42 exists; list the missing ones in your log, do not fabricate them.
  Same for every `imageSrc` in `comparisons.json`.
- `/admin/contenido`: add the "imágenes de comparación faltantes" count next to the existing missing-weeks count.
- Run the U7 e2e and a local Lighthouse on `/`: LCP must not be worse than U7's baseline; if it is, the cause is
  almost always an over-large current-week image — fix the size, not the code.
- Do **not** commit anything under `docs/screenshots/`.

Exit: gates green (§4.3); the hero composites real renders for every week that has one; `/admin/contenido`
reports exactly what is still missing. Open the PR that turn; write `docs/log/u10.md`. Then continue per the run file that started you.
