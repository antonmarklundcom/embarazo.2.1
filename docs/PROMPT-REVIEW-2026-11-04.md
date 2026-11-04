# Kick-off prompt: review the night run and handle migrations (Opus 5.5)

Start the session on `antonmarklundcom/embarazo.2.1`. Approve the one `add_repo` prompt for
`antonmarklundcom/embarazo` when it appears.

---

```
# Review the 4 November 2026 night run, then handle migrations and whatever is left

Repos:
- App: antonmarklundcom/embarazo.2.1 (this checkout). "Mi Bebé · Embarazo Paraguay", Next.js 15
  PWA, live at https://app.embarazo.com.py, Hostinger Node.js app that deploys `main`.
- Site: antonmarklundcom/embarazo (embarazo.com.py, static PHP 8.3; Hostinger deploys `main`,
  so a merge there is a production deploy). Attach it with add_repo (owner antonmarklundcom,
  repo embarazo, access push), clone it next to this checkout, call register_repo_root.

Context. An autonomous session opened app PRs #160–#164 overnight (sharing links, install
prompt and counters, push defaults, manifest/SEO, home hero shell, offline e2e fix, shorter
onboarding, names seed) and was then told to merge them in order 160 → 161 → 162 → 163 → 164
and to open and merge a small doc PR from branch claude/night-run-merged-20261104. Its report
is docs/NIGHT-RUN-2026-11-04.md. The site half of the plan (items 11–20) was never started;
its full spec is Part 3 of docs/PROMPT-FOLLOW-UP-2026-11-04.md (on branch
claude/wizardly-gauss-8tp9ns if not yet on main). Anton does not want questions: make
reasonable calls, record them in PR bodies under "Decisions I made for you", and list anything
only he can do under "Needs Anton".

Read first: AGENTS.md, docs/INDEX.md, docs/ARCHITECTURE.md §4, KNOWN-ISSUES.md,
docs/NIGHT-RUN-2026-11-04.md, docs/PROMPT-FOLLOW-UP-2026-11-04.md. DECISIONS.md is 265 kB:
grep it (entries dated 2026-11-04), never read it whole.

Rules (the repos' own rules win): never rename mibebe.* storage keys, the Dexie DB name, SW
cache names or route paths; no middleware.ts; push permission only on an explicit "Sí"; never
apply schema changes to production; never skip, weaken or disable a test; never
git push --no-verify; no image or video generation; subagents on "opus" for hard units,
"sonnet" for routine work, "haiku" for trivial fan-out, never Fable/Mythos; no model names in
commits. Every app PR gets the run-ci label, but note GitHub Actions produced no check runs on
the night PRs, so local gates are the gate.

App gates: npm ci, npx tsc --noEmit, npm run lint, npm test, npm run test:db,
npm run validate:content,
PHOTO_STORAGE_ENDPOINT=https://bucket.example.test NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py npm run build,
npx playwright test <touched specs> (Chromium preinstalled; never run playwright install).
For lib/server/ or drizzle/ changes: local MariaDB, TEST_DATABASE_URL to a throwaway database,
npm run test:mysql.

## Part 1 — verify the merges actually happened and main is healthy
1. List PRs #160–#164 and the doc PR. For each: merged or not, merge SHA, and whether its head
   SHA matched the night-run doc (160 d615f76, 161 656fe8c, 162 5e56c7a, 163 90c2130,
   164 a01003f). If any is still open, run the full app gates on its head and merge it with a
   merge commit in the stated order (161–163 each contain the previous branch, so update from
   main with a merge commit if GitHub reports a conflict, re-run gates, then merge).
2. On main after the merges: the full gate list plus the full Playwright suite once. Known
   flakes (KNOWN-ISSUES.md; account-entry teardown timeout; pregnancy-calendar two-tab refresh):
   rerun once, report honestly. Fix any real regression on a branch claude/post-merge-fixes-20261104,
   PR, merge.
3. Live check without secrets: npm run smoke:live against https://app.embarazo.com.py; also
   fetch /manifest.webmanifest, /sitemap.xml, /robots.txt, /semana/20 and its opengraph image,
   /.well-known/assetlinks.json, and confirm the deployed build carries the night-run changes
   (shortcuts in the manifest, no mibebe.app in robots or sitemap, JSON-LD on /cuenta). If
   Hostinger has not redeployed yet, say so and list what to check later; do not try to trigger a
   deploy.
4. Review the Dependabot PRs #158 and #159: full gates on each; merge if green and the changelogs
   show no breaking change (next-auth stays on 5.0.0-beta.32; see DECISIONS.md "PR-13", "PR-16");
   otherwise comment why.

## Part 2 — migrations
1. Grep everything merged since 6d9fea0 for changes under drizzle/ or lib/server/schema.ts and
   report. The night-run doc says none.
2. The 14-day "volvé a la app" push shipped only its device half (lib/push/lapse.ts, flag
   LAPSE_NUDGE_SERVER_READY = false). Build the server half on branch
   claude/lapse-push-server-20261104: new pushReminders.category enum value, versioned Drizzle
   migration (npm run db:generate, on top of 0017), the route field, the dispatcher path, the
   service-worker sentence, unit tests, and npm run test:mysql on a throwaway MariaDB that first
   had migrations 0000–0017 applied in order. Keep the opt-out in Ajustes. Keep the flag so a
   deploy without the migration cannot error; flip it only in the doc's "after migration" step.
3. Write docs/MIGRATION-2026-11-04-LAPSE-PUSH.md: exact SQL, backup first, how Anton applies it
   (DATABASE_URL=<prod> npm run db:migrate from his machine, or the SQL pasted in phpMyAdmin),
   verification (SHOW COLUMNS FROM pushReminders), rollback SQL, and the env flag to flip after.
   Never run anything against production.
4. PR with run-ci label, gates, merge. The migration itself goes under "Needs Anton".
5. If any other migration turns up in step 1, document it the same way before merging anything
   that depends on it.

## Part 3 — the site half, if time allows
Run Part 3 of docs/PROMPT-FOLLOW-UP-2026-11-04.md exactly as written (batches S1 → S4, one PR
each, merge only when ./verify.sh passes on the repo and on the deploy zip, since a site merge
deploys production). Item 16's site half needs app PR #164 merged first.

## At the end
Update docs/NIGHT-RUN-2026-11-04.md with a "Review 2026-11-04" section (merge SHAs, main gate
results, live-check results, migration PR, site batches done or not). Final message to Anton in
plain language: what is merged and live, what is not and why, the migration he must apply with
the doc path, and anything flagged for medical or native review. No questions.
```
