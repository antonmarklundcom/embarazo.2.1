# Growth plan — drafts for the next session (2026-09-27)

Work started but not shipped when the first session stopped. Not wired into the app: the
`.draft` suffix keeps them out of the build, lint and tests. Move each into place in its own
PR (growth plan in `antonmarklundcom/embarazo` `docs/growth-plan-2026-09.md`).

| File | Goes to | Batch | State |
|---|---|---|---|
| `ejercicios-brief.md` | append to `public/assets/ejercicios/README.md` and the PR body | F (item 15) | written, reviewed against every step text |
| `place-exercise-art.mjs.draft` | `scripts/place-exercise-art.mjs` | F (item 15) | tested on a throwaway seed copy: 960×720 WebP, edits only the targeted `imageSrc` lines |
| `YA-NACIO-PLAN.md` | `docs/YA-NACIO-PLAN.md` (the one-page plan G asks for first) | G (item 9) | written |
| `baby-age.ts.draft` + `baby-age.test.ts.draft` | `lib/baby/age.ts` + `lib/baby/age.test.ts` | G1 | 7 unit tests pass |

Still to do in F: the "Ejercicios" tile icon in `components/ToolIcon.tsx` (a new `exercise`
case; `app/(app)/herramientas/page.tsx` still uses `"checklist"`), and `.gitignore` for
`public/assets/ejercicios/src/`.
