# Unit U9 — AI-drafted answers inside the curated Q&A queue. SONNET session. No dependencies. Optional.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §3 and §4, `docs/HANDOFF-2026-09-06.md` §3 (AI inventory),
`DECISIONS.md` section "PR-7 / K20", BUILD-PLAN.md F1/F2, `lib/server/aiBaby.ts` (how the Gemini key and the kill
switch are handled — copy the structure, not the code), `lib/server/questions.ts`, `app/admin/preguntas/page.tsx`,
`components/admin/AdminQuestionActions.tsx`, `app/admin/actions.ts` (`answerQuestion`). Execute under the autonomy
protocol (§4). This is Gemini (already integrated), not a new provider.

Owns: `lib/ai/draft.ts` + `.test.ts` (pure: prompt assembly, output sanitising) · `lib/server/aiDraft.ts` ·
`app/admin/preguntas/**` · `components/admin/AdminQuestionActions.tsx` · `app/admin/preguntas/actions.ts` (new) ·
`lib/admin/audit.ts` (append `draft_generated` + meta) · `.env.example` (append `AI_DRAFT_ENABLED`,
`AI_DRAFT_DAILY_CAP`) · `docs/log/u9.md`.

Build:
- **Nothing generated ever reaches a user.** The draft is returned to the admin UI as an editable prefill of the
  existing answer textarea; publishing still goes through `answerQuestion` unchanged. Assert in a test that no file
  under `app/(app)` or `app/api/v1` imports `lib/server/aiDraft.ts`.
- `lib/server/aiDraft.ts`: enabled only when `AI_DRAFT_ENABLED === "true"` and `GEMINI_API_KEY` is set (fails
  closed, same as F1); text model (Gemini flash), the key sent as a header, never logged, no `console.` in the module
  (F1's source-scan rule — add the same scan). Input: the question text + the app's stance in the system prompt:
  es-PY voseo, informational not medical, always point to the control prenatal and `/emergencia` for alarm signs,
  never diagnose, never name a medication dose, ≤ 120 words. Output sanitised (strip markdown, links other than
  in-app routes).
- Cost control without a migration: cap `AI_DRAFT_DAILY_CAP` (default 20) drafts per UTC day, counted from
  `adminAudit` rows with action `draft_generated` — the audit row is written **before** the model call so a crash
  still counts. Meta `{ questionId }` only.
- UI: a "Sugerir borrador" button per pending question; the draft lands in the textarea with a visible "borrador
  generado por IA — revisá antes de publicar" label; the button disappears when the feature is disabled or the cap
  is reached (with the reason shown).
- Tests: prompt assembly pins the safety instructions (a test asserts the phrases); sanitiser; cap logic against an
  in-memory audit store; e2e: button absent when disabled.

Exit: gates green (§4.3); with the feature disabled the queue is byte-identical to today; with it enabled an admin
gets an editable draft, audited, capped. Open the PR that turn; write `docs/log/u9.md`. Then continue per the run file that started you.
