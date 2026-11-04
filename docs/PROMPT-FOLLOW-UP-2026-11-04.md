# Prompt for the follow-up session (paste into a new Opus 5.5 or Sonnet 5.5 session)

Start the session **on the site repo** `antonmarklundcom/embarazo`, approve the one
`add_repo` prompt for `antonmarklundcom/embarazo.2.1` when it appears, then let it run.

---

```
# Follow-up to the night run of 4 November 2026 — migrations, merges, and the site batches

Two repos:
- App: antonmarklundcom/embarazo.2.1 ("Mi Bebé · Embarazo Paraguay", Next.js 15 PWA, live at
  https://app.embarazo.com.py, Hostinger Node.js app deployed from `main`). Attach it with the
  add_repo tool (owner antonmarklundcom, repo embarazo.2.1, access push), clone it next to this
  checkout and call register_repo_root.
- Site: antonmarklundcom/embarazo (embarazo.com.py, static PHP 8.3 SEO site, Hostinger deploys
  `main` automatically, so a merge there is a production deploy). This checkout.

Last night an autonomous session finished the ten app items of a 20-item growth plan and opened
five app PRs. It could not attach the site repo, so the ten site items were never started.
Its report is `docs/NIGHT-RUN-2026-11-04.md` on the app branch
`claude/night-perf-offline-onboarding-20261104`. Read it first.

Anton does not want questions. Make reasonable calls, record each in the PR body under
"Decisions I made for you", and keep going. If something truly needs him, list it under
"Needs Anton" and move on.

## Read before touching code
App: AGENTS.md, docs/INDEX.md, docs/ARCHITECTURE.md §4, KNOWN-ISSUES.md, docs/NIGHT-RUN-2026-11-04.md.
DECISIONS.md is 265 kB: grep it, never read it whole.
Site: AGENTS.md, README.md, plan.md §1–§2, KNOWN-ISSUES.md, docs/app-facts.md,
docs/growth-plan-2026-09.md (rules and log), docs/human-todo.md.

## Hard rules (the repos' own rules win over this prompt)
- App: never rename `mibebe.*` storage keys, the Dexie DB name, SW cache names or route paths.
  No middleware.ts. No soft-delete flags. Push permission only on an explicit "Sí". Every new
  medical/safety sentence is flagged for the medical reviewer. One short DECISIONS.md entry per
  product decision. Never apply schema changes to production; prepare them for Anton.
- Site: content in content/*.php, three-line route files, no forms, no email capture, no
  pop-ups, no tracking beyond the cookieless Cloudflare switch (leave its token null). Clinical
  text is class (B): concrete, conservative, ranges, no doses; every new health/legal page is
  logged in docs/facts-to-verify.md as pending review. Every law, office, price or phone number
  needs a sources[] entry. Never invent a source URL: add a URL only after you fetched it and it
  is the official page. Never add .github/workflows/ to the site. es-PY voseo.
- Both: no image or video generation (re-encoding existing images is fine). Never
  `git push --no-verify`. Never skip, weaken or disable a test to get green. Commit messages
  carry no model names. Subagents: "opus" for hard units, "sonnet" for routine content and code,
  "haiku" for trivial fan-out. Never Fable/Mythos.

## Gates
App: `npm ci` once, then `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:db`,
`npm run validate:content`,
`PHOTO_STORAGE_ENDPOINT=https://bucket.example.test NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py npm run build`,
then `npx playwright test <touched specs>` (Chromium is preinstalled; never run
`playwright install`). For anything under lib/server/ or drizzle/: install MariaDB locally,
point TEST_DATABASE_URL at a throwaway database and run `npm run test:mysql`. App CI is
label-gated: every app PR gets the `run-ci` label.
Site: `php -l` on every touched PHP file, `./verify.sh`, then `./deploy/make-zip.sh` and
`./verify.sh --root dist/<slug>-<date>`, `node --test tests/` for calculator math,
`php tools/sources-report.php --list` (read-only).

## Part 1 — land the five app PRs (merge order #160 → #161 → #162 → #163, then #164)
PRs: https://github.com/antonmarklundcom/embarazo.2.1/pull/160, /161, /162, /163, /164.
For each, in order:
1. Read the PR body and diff. Run the full app gate list on the head commit.
2. Check CI (`run-ci` label, the `fast` and `build` jobs). Fix anything red on the same branch;
   do not rebase or rewrite history.
3. Subscribe to the PR (subscribe_pr_activity) and merge it with a merge commit once gates and
   CI are green. #161–#163 are each built on the previous branch, so after each merge update the
   next PR's branch from `main` (merge, not rebase) and re-run the gates before merging it.
4. If a PR is not mergeable and the fix is not obvious inside an hour, leave it open, write why in
   a PR comment, and continue with the next independent one.
Also review the two Dependabot PRs (#158 production deps, #159 development deps): run the full
gates on each; merge if green and the changelogs show no breaking change for the pinned majors
(next-auth stays on 5.0.0-beta.32; see DECISIONS.md "PR-13", "PR-16"). Otherwise comment why.

## Part 2 — migrations
Night-run item 4 shipped only the device half of the 14-day "volvé a la app" push. The server
half needs: a new `pushReminders.category` enum value, a versioned Drizzle migration under
`drizzle/`, the optional route field, and the service-worker sentence
(`LAPSE_NUDGE_SERVER_READY`; see lib/push/ on the #161 branch and the night-run doc).
1. Grep the five merged PRs for any change under drizzle/ or lib/server/schema.ts. Report what
   you find; the night-run doc says there was none.
2. Implement the server half on branch `claude/lapse-push-server-20261104`: schema change,
   `npm run db:generate` for the migration, the dispatcher path in the push code, unit tests, and
   `npm run test:mysql` against a throwaway MariaDB that first has every existing migration
   applied in order (prove the new migration applies on top of 0017 cleanly, and that the app
   builds and the push dispatch e2e passes with it). Keep the nudge opt-out in Ajustes.
3. Write `docs/MIGRATION-2026-11-04-LAPSE-PUSH.md`: the exact SQL the migration runs, a backup
   step first, how Anton applies it on Hostinger (either `DATABASE_URL=<prod> npm run db:migrate`
   from his machine, or the same SQL pasted in phpMyAdmin), how to verify
   (`SHOW COLUMNS FROM pushReminders`), and the rollback SQL. Never run anything against
   production. Say plainly in the PR that deploying the code before the migration is safe only if
   that is true; if the code must wait for the migration, gate it behind the existing
   `LAPSE_NUDGE_SERVER_READY` switch so a deploy without the migration cannot error.
4. Open the PR with the `run-ci` label, merge it when green, and list the migration under
   "Needs Anton" in your final message. It is the one thing he must do by hand.

## Part 3 — the site batches that were not done (items 11–20 of the night plan)
Branch per batch from `main`: `claude/night-<batch>-20261104`. One PR per batch. Because a
site merge deploys production, merge a site PR only when `./verify.sh` passes on the repo AND on
the deploy zip, the Lighthouse-style checks in docs are not regressed, and you have rendered the
new pages with `php -S` and looked at the HTML. Merge in order S1 → S2 → S3 → S4.

Batch S1 — internal linking + technical SEO + performance (items 14, 19, 20)
- Item 14: 0 of 42 weeks link /calculadora/ and 0 content pages link /instalar/
  (content/semanas.php, content/articulos.php, templates/week.php, partials/cta-*.php,
  partials/sticky-cta.php). Add a calculator link in templates/week.php near the lead/size panel;
  an "instalala en tu teléfono" secondary link inside cta-primary and cta-week; put
  /calendario-de-ovulacion/ in the footer and the /planear/ hub and link it from weeks 1–3;
  contextual week→article links through the existing related[] (weeks 5–12 → carné perinatal and
  inscribirse en IPS; weeks 28–38 → licencia-de-maternidad and subsidio-de-maternidad-ips);
  content/nav.php adds Instalar and Blog to the header and FAQ and Familia to the footer; the 404
  page (404.php, near line 457) links /semana/, /calculadora/ and the app; the blog index
  (content/pages.php around 1112–1115) links the H2 itself and prints a human date.
- Item 19: 404.php (around 434–440) plus partials/head.php:57 emit a canonical on the noindex 404
  (skip canonical when noindex); .htaccess FilesMatch on .json and router.php (around 382) block
  /.well-known/*.json and *.webmanifest (add exceptions); no HSTS (add
  Strict-Transport-Security max-age=31536000, no preload); image cache rules conflict (1 month vs
  immutable 1 year: pick one and say which); robots.php lines 21–23 have template leftovers
  (/enviar.php, ?enviado=, ?error=) to remove; sitemap.php gets the image namespace with week,
  article and hub images; lib/seo.php (around 455) SoftwareApplication uses a UTM'd url (use the
  clean app origin, add installUrl and screenshot, add it to /instalar/); head.php 21–25 emits a
  one-item BreadcrumbList on home (skip it); Organization gets a logo from an existing icon asset.
  Extend verify.sh where cheap.
- Item 20: partials/head.php (around 100–108) loads fonts.css and site.css render-blocking;
  inline fonts.css into site.css and keep the two font preloads. Six hub heroes exceed the 60 KB
  WebP budget in plan.md §8 (e.g. assets/img/alimentacion-embarazo-terere-paraguay-1152.webp at
  106 KB): re-encode with sharp or cwebp at lower quality, same dimensions. Spell out "fecha
  probable de parto" in the calculator title in content/tools.php (title ≤ 60 chars).

Batch S2 — E-E-A-T data + blog (items 17, 18)
- Item 17: lib/seo.php (around 506–508) uses the Organization as author and falls back to
  `updated` for datePublished. Add a datePublished key to weeks, articles and blog, using each
  record's first git commit date (a script over git log is fine), render it, keep
  dateModified = updated. Fix reviewer markup for the day it is filled (hasCredential as
  EducationalOccupationalCredential; mirror reviewedBy onto Article). Fill missing official
  source URLs only where you fetched the page and it is MSPBS, IPS, MTESS, OMS or official law
  text; leave null otherwise. Do not add a named person as author and do not touch the
  "sin revisor" disclaimer; both are Anton's call.
- Item 18: content/blog.php has 6 posts all dated 2026-09-20 that duplicate evergreen pages
  (dengue, ley 7383, calor/tereré, instalar, familia). Add a prominent "guía completa" link from
  each post to its evergreen twin. Write 4–6 new seasonal posts with real dates (not in the
  future), sources[], FAQ, related, logged in facts-to-verify.md when clinical or legal, each with
  its three-line route file. Topics: dengue season start, heat and hydration in summer, PAI
  vaccination campaign reminders, Registro Civil inscription steps, what the app's Emergencia
  screen does, following the pregnancy from abroad.

Batch S3 — content clusters (items 11, 12, 13). Use "sonnet" subagents per article with the
article schema from README.md; review every one for class (B) compliance before commit.
- Item 11, /salud/: náuseas y vómitos; sangrado o manchado; flujo vaginal; dolor abdominal
  (cuándo preocuparse); infección urinaria; cuánto peso ganar. 800–1,500 words, answer-first
  lead, alarm signs link to /salud/senales-de-alarma/, weeks[] set, appHandoff to a relevant
  app tool.
- Item 12, /salud/ or /tramites/: ecografías del embarazo (cuáles y cuándo, MSPBS schedule);
  análisis del primer control (glucosa 24–28, VIH/sífilis, toxoplasmosis); cuándo se sabe el sexo
  del bebé; medicamentos en el embarazo (general rules, no doses, "consultá"); embarazo gemelar.
- Item 13, new cluster `posparto` (content/clusters.php, hub route, nav and footer):
  cuarentena y recuperación; lactancia materna (WHO: exclusive to 6 months); depresión posparto
  (Línea 155 and public services, no diagnosis); primeros controles del bebé y PAI (no vaccine
  ages unless sourced from MSPBS, matching the app's rule); vuelta al trabajo y hora de lactancia
  (link derechos). Every page: sources[] (official or WHO/MSPBS), disclaimer partial, FAQ,
  related ≥ 2, logged in facts-to-verify.md, added to deploy/routes.php so verify.sh smoke-tests
  it.

Batch S4 — calculators + nombres (items 15, 16 site half)
- Item 15: new tool pages following calculadora/, content/tools.php, assets/js/tools/** and
  tests/pregnancy.test.mjs: fecha de concepción (from FPP or FUM); semanas ↔ meses (the site's
  week_month() table); licencia de maternidad dates from the FPP (Ley 5508, 18 weeks, split as
  already stated in /derechos/licencia-de-maternidad/; reuse that record's figures and source).
  Each: JS island, no network, unit tests, WebApplication JSON-LD, CTA to the app using the
  fragment-date contract in docs/app-facts.md (dates in #, never in the query).
- Item 16 site half: app PR #164 grew lib/seed/names.json to ≥ 15 per gender per origin. After it
  is merged, run `php tools/import-names.php ../embarazo.2.1`, add niña/niño pages per origin
  (templates/names.php genderPages) and an FAQ, add the pages to the sitemap and
  deploy/routes.php, and log the 17 new Guaraní meanings in facts-to-verify.md for native review.

## At the end
1. App repo: update docs/NIGHT-RUN-2026-11-04.md with a "Follow-up 2026-11-04" section: PR
   links, merged or not, gates per PR, the migration status. Site repo: add
   docs/log/night-run-2026-11-04.md and append one line per item to the log section of
   docs/growth-plan-2026-09.md.
2. Final message to Anton in plain language: what was merged, what is still open and why, the
   one migration he must apply (with the doc path), and anything flagged for medical or native
   review. No questions.

Start with Part 1.
```
