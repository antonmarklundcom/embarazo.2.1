# Unit U5 — D6 "Ejercicios" classes, images + text. SONNET session. No dependencies (images arrive later).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §1(4), §2–§4, §7–§8, `docs/HANDOFF-2026-09-06.md` §2 (D6),
BUILD-PLAN.md D6 + G1 + PR-19 line in `DECISIONS.md` ("PR-19 (planned)"), `lib/content/schemas.ts`,
`lib/seed/food.ts` (seed module pattern), `lib/server/contentDebt.ts`, `app/(app)/herramientas/page.tsx` (the locked
"Pronto" tile), `app/(app)/herramientas/kegel/**` (a tool page to copy). Execute under the autonomy protocol (§4).

Owns: `lib/seed/ejercicios.json` + `.ts` + `.test.ts` · `lib/content/schemas.ts` (append one block) ·
`scripts/validate-content.mts` (register + image-existence check) · `app/(app)/herramientas/ejercicios/**` ·
`app/(app)/herramientas/page.tsx` (one tile, locked until content is published) · `lib/server/contentDebt.ts`
(append one row: missing exercise images) · `public/assets/ejercicios/README.md` · `e2e/ejercicios.spec.ts` ·
`docs/log/u5.md`.

Build:
- `ExerciseSchema`: `id`, `title`, `trimesters: (1|2|3)[]`, `durationMin`, `equipment: "sin equipo" | string`,
  `benefits[]`, `steps: { text, imageSrc }[]` (1–4 steps), `avoidIf[]` (plain-language: "si tu médico te indicó
  reposo", "si tenés sangrado o pérdida de líquido"…), `stopSigns[]`, `source` (public guideline: ACOG / WHO / MSPBS).
- **Gate:** `publishedOnly()` as always, plus the validator fails an entry whose `imageSrc` is not a file under
  `public/assets/ejercicios/` — unless the entry carries `"placeholder"` in `imageSrc`, in which case it validates
  and stays hidden. Ship all entries with placeholder image paths and a README listing the exact filenames the
  founder must drop in. Entries light up per exercise as files land, no code change.
- Content, 10–14 exercises in es-PY voseo, general prenatal fitness only: caminar, inclinación pélvica, gato-vaca,
  sentadilla con apoyo, elevación lateral acostada de lado, estiramientos, respiración, Kegel (link the existing tool).
  Rules baked into the data: no supine positions after week 16, no breath-holding, no contact/fall-risk activities,
  every entry carries `avoidIf` + `stopSigns`. This is wellness content under the general disclaimer; anything that
  reads as an instruction for a diagnosed condition (diabetes gestacional, preeclampsia…) does not belong here.
- Routes: `/herramientas/ejercicios` (filter defaults to the user's trimester, all trimesters selectable) and
  `/herramientas/ejercicios/[id]` (static, 42-week precache budget: images are runtime-cached, not precached).
  Disclaimer block via `MedicalReviewByline`. Tile in the tools grid uses the same locked/"Pronto" behaviour as
  videos while zero exercises are published.
- Tests: schema + gate + "no supine after 16" as a data invariant test; validator image check; e2e: locked tile
  with nothing published; with one entry given a real test image, the list and detail render.

Exit: gates green (§4.3); `npm run validate:content` covers the collection and the image check; the tile is
locked in production today and the README tells the founder exactly which files unlock it. Open the PR that turn;
write `docs/log/u5.md`. Then continue per the run file that started you.
