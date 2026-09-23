# Prompt for the next session (paste into a new Claude Code window)

Recommended: Opus 5.5, effort **high** for the first message (it reviews a
security-relevant branch), then medium is fine for the P1 fixes.

---

```
Repo: antonmarklundcom/embarazo.2.1 ("Mi Bebé · Embarazo Paraguay", Next.js 15
pregnancy PWA). Work on branch claude/gallant-sagan-sup7si — PR #117
(https://github.com/antonmarklundcom/embarazo.2.1/pull/117); it carries
last night's overnight review and fixes.

Read, in this order, and nothing else up front:
1. docs/REVIEW-2026-09-23.md — what was done overnight, the verified findings
   NOT fixed yet (§2, the plan, P0/P1/P2), business notes, and §7 (worker
   batches merged).
2. AGENTS.md and docs/INDEX.md (for the repo's rules; DECISIONS.md is 265 kB —
   grep it, never read it whole).

Then do this, without asking me unless a step needs a founder decision:

A. Verify the branch: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`,
   `npm run test:db`, `npm run validate:content`,
   `PHOTO_STORAGE_ENDPOINT=https://bucket.example.test NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py npm run build`,
   then `npx playwright test` (full). Known flakes are listed in
   KNOWN-ISSUES.md — rerun those once and report honestly. Fix anything this
   branch broke.

B. Re-review the security-relevant diffs on this branch with fresh eyes
   (git diff d35b12d..HEAD -- lib/server/ app/api/): the OAuth pre-hijack fix
   and admin-promotion gate in lib/server/auth.ts, the invite accept changes in
   lib/server/sharing.ts / sharingBackend.ts, the sync paging/overlap changes,
   the photo upload size signing. Look for regressions and for anything the
   fix missed (e.g. does next-auth's adapter link BEFORE or AFTER the signIn
   callback? confirm in node_modules/@auth/core/lib/actions/callback).

C. PR #117 already exists for this branch. Check its CI and review
   comments, fix anything red, and get it green and mergeable (subscribe to
   its activity so CI/review events wake you).

D. Then work down docs/REVIEW-2026-09-23.md §2 P1 items that are code (not
   founder tasks), one commit each, in order: "tu sanatorio" copy sweep,
   weekly-push opt-in at the end of onboarding, hide/seed the empty
   "Cerca tuyo" tab (behind a flag), daily tips 33 → 100+ (es-PY voseo,
   non-medical, flagged for reviewer), then propose (don't build) the
   anonymous activation/retention counter + ?src= attribution as a
   DECISIONS.md-style data-contract note for me to approve.

Rules: do not generate images or video unless I write "Generate image" /
"Generate video". Don't rename storage keys, Dexie DB names, SW cache names or
routes. Every new medical/safety sentence gets flagged for the medical
reviewer rather than presented as reviewed. At the end, update
docs/REVIEW-2026-09-23.md (§7 status) and tell me in plain language what's
done, what's not, and what needs me.
```
