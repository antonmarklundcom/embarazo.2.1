# Unit U2 — I4 AI usage & spend panel. SONNET session. Depends on U1 (merged).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §2–§4 and §7, `docs/HANDOFF-2026-09-06.md` §3–§4,
BUILD-PLAN.md F1/F2/I4, `docs/log/u1.md`, `lib/server/flags.ts`, `lib/ai/quota.ts`, `lib/server/aiBaby.ts`,
`app/admin/patrocinios/page.tsx` (the admin page shape to copy). Execute under the autonomy protocol (§4).

Owns: `app/admin/ia/**` · `lib/server/aiSpend.ts` · `components/admin/AiSpendControls.tsx` ·
`lib/server/aiBaby.ts` (only the enabled-check: add the pause flag) · `app/admin/layout.tsx` (append one nav link) ·
`.env.example` (append `AI_BABY_ALERT_SHARE`) · `docs/log/u2.md`.

Build:
- `lib/server/aiBaby.ts`: the feature is enabled only when `AI_BABY_ENABLED === "true"` **and**
  `getFlag("ai_baby_paused") === false`. Paused requests get the same response shape as the kill switch (the client
  already handles it). Unit test both directions; the flag can never enable a feature the env left off.
- `lib/server/aiSpend.ts` (metadata only, reads `aiGenerations`): for the current UTC month and the previous one —
  generations by status (ok / failed / pending), spend in USD from `costUsdMicros` vs the configured ceiling,
  distinct users, users at quota, and the configured quota. Never select prompts or photos (there are none — keep
  it that way; the admin source scan enforces it).
- `/admin/ia`: those numbers, the two env limits shown as read-only with a note that they change via env, a
  **Pausar / Reanudar** control calling `setFlag("ai_baby_paused", …)` (audited by U1's helper — do not write a
  second audit path), and an alert banner when spend ≥ `AI_BABY_ALERT_SHARE` (default 0.8) of the ceiling.
  Also surface that banner on `/admin` **only** if `app/admin/page.tsx` exposes a slot for it without you editing
  the page; otherwise leave it to U11 and note it in your log.
- Copy in es-PY; amounts in USD with the ₲ approximation the F2 section uses.
- Tests: `aiSpend` against an in-memory store (same style as `lib/server/aiBaby.test.ts`); the enabled-check;
  e2e: `/admin/ia` 404s for a non-admin.

Exit: gates green (§4.3); the founder can read "what did AI cost this month" and pause it in one click, and the
pause is visible in the audit log. Open the PR that turn; write `docs/log/u2.md`. Spawn nothing.
