# Mi Bebé: continuation handoff for Opus — 16 October 2026

This is the current design/image handoff. Read it with the latest owner manual and actual Git state; September plans and older progress checkpoints do not establish today's release status. Communicate with Anton in **English only**. Product copy remains **Spanish for Paraguay**.

## Start here and resolve the current source

- Repository: https://github.com/antonmarklundcom/embarazo.2.1
- Canonical checkout: `E:/ai work/Projects/embarazo.2.1/worktrees/claude-embarazo.2.1`. Reuse it and its existing dependencies. Do not clone, reinstall, reset, discard, or move unrelated work merely to inspect the project.
- Owner manual: `C:/operation manuals/embarazo.2.1/README.md`. Read the most recent final release block before historical checkpoints.
- Read applicable `AGENTS.md`, `C:/operation manuals/STORAGE-MAP.json`, `PROJECTS.json`, and `storage/AI-STORAGE-HANDOFF.md` first. E: must be connected. New nonsecret outputs belong under `E:/ai work/Artifacts/embarazo.2.1/<date>`; task caches/temp under E:. Manuals/registers stay on C:. No new outputs/checkouts in OneDrive.
- Working branch for this release: `codex/flo-inspired-design-20261016`; baseline merged PR145, `6e1730332eb3054d14b1ca7cdf0018be7de55716`. Fetch and inspect actual status/head/PR before changing anything. A historical baseline is not permission to reset today's source.
- Technical reading: [design/image release note](DESIGN-IMAGERY-2026-10-16.md), [current official-source Preggers research](PREGGERS-RESEARCH-2026-10-16.md), [architecture](ARCHITECTURE.md), especially §4, and [notification/install runbook](NOTIFICATIONS-INSTALL-HOSTINGER.md). Search `DECISIONS.md` only for relevant sections; do not read the entire log or execute old queues blindly.

**Release verification:** Final browser acceptance and PR/automatic-deployment evidence are being completed. The canonical owner manual and dated external `design/RELEASE-REPORT.md` record the verified final source, PR, merge, Hostinger build and live results separately. Do not infer deployment from this document or from a successful local build alone.

## What Anton approved and what is implemented

The approved direction closely references Flo's layout quality: generous whitespace, clear hierarchy, large realistic pictures, quiet cards, readable headings and simple navigation. Mi Bebé keeps its own identity and Spanish-for-Paraguay copy. Paraguay is a restrained ñandutí accent, rather than decoration on every card. Do not copy Flo logos, proprietary illustrations or article text, or imply an affiliation. Private screenshots were visual references only and are not in the repo. An accidentally attached bank receipt was excluded entirely.

Five implemented improvements:

1. A benefit-led public welcome at existing `/cuenta` explains the app before the account form. `?ingreso=1` opens the existing login/health-consent step. Public advice and emergency information remain reachable. Account errors/deletion, returning devices and safe `returnTo` destinations are preserved.
2. A clearer home order: weekly development, next appointment, a daily moment, relevant reading, tools, family support. The weekly hero is more spacious, with a wider desktop shell and larger mobile image.
3. Guides now use three visual shelves—`Cuidá tu salud`, `Tu día a día`, `Prepará la llegada`—covering the eight existing articles. Mobile shelves are keyboard accessible; desktop uses grids. Unsupported popularity labels and unpublished video placeholders were removed.
4. Realistic local imagery covers development, food comparisons, exercises, infant ages, guide topics, welcome, family and nutrients. Pictures match the existing topic; a nutrition photo must never replace the weekly baby image or imply a new medical claim.
5. Near-white surfaces, calmer brand colors, spacing, clear selected navigation, at least 44px navigation targets, corrected small-text contrast, and a skip link with a sticky-header scroll offset. Existing settings, emergency access, perspective/theme controls and tools remain.

Key files: `components/WelcomeScreen.tsx`, `EditorialCard.tsx`, `EditorialPicture.tsx`, `RealisticPicture.tsx`, home/hero components, `app/(app)/cuenta/page.tsx`, `guias/page.tsx`, the app layout and `app/globals.css`. Tests describe the intended entry, layout, keyboard and image behavior.

## Images are finished: do not generate or pay again

Anton authorized **200 + 18 + 4 = 222 Higgsfield credits total**. The verified setting was `nano_banana_2_1`, **2K / High**, **2 credits per image**, maximum eight active jobs. 4K was quoted at three credits and was not used. No further generation spend is authorized by this handoff.

Final accounting: **112 acknowledged jobs**, **111 completed**, **one failed/refunded**. Four completed results were rejected: an infant collage, an incorrect raised-heel calf stretch, and two ankle images with extra legs. Correct replacements were reviewed. **107 distinct accepted images cover 108 functional slots** because one whole-melon photo is reused for existing melon size variants. Net spend is **222 credits**, reconciled from the quote, job IDs and balance change. The connector has no transaction-ledger API; do not invent billing evidence.

Coverage: 40 weekly renders for weeks 3–42, 24 exercise steps, four infant age bands, 21 distinct comparison photos for 22 canonical comparison paths, and 18 editorial images (welcome, eight guides, family, eight nutrient topics). Weeks 1–2 retain the intentional no-embryo presentation. Adult casting follows Anton's approved broad mix of Paraguayan/Southern European family appearances, including Indigenous Paraguayan appearances, across fictional adults with varied healthy builds. Do not expose or rank individuals' identities or turn casting preferences into product behavior.

The old app and website images were mapped correctly: all 40 old app originals matched the separate website source hashes and same-week thumbnails. Week 16/17/18 hair reversal came from inconsistent generations, rather than a numeric-order bug. The replacement sequence was reviewed across all 42 weeks; weeks 16–18 are consistently without scalp hair. Development renders remain illustrations, not patient scans or a clinical certification. All clinical numbers and measurement conventions, including the week-20 measurement-basis transition, are unchanged.

Image plumbing:

- `lib/editorial-image-slots.json`: 18 editorial slots. `lib/realistic-image-slots.json`: 90 canonical aliases (40 weekly, 24 exercise, four infant, 22 comparisons).
- `lib/editorialImages.ts` reads actual derivative dimensions; `lib/realisticImages.ts` resolves canonical paths while stripping query strings only for lookup. `RealisticPicture` retains original fallback URLs, dimensions, refs, load/error hooks and accessibility props.
- `public/assets/img/`: **107 sets / 535 images / 11,849,616 bytes**: 640/1280 AVIF + WebP and 1200×630 OG JPEG for each accepted image. Strict optimized-folder audit passes with zero findings; every derivative is within its budget. Runtime `manifest.json` is compact (76,280 bytes), local-only, without source workstation paths or converter snippets.
- Existing WebP compatibility paths remain: 640px for weekly/infant/comparison, 1280px for exercises. Two existing SVG fallback paths remain valid; their normal responsive render is mapped to the realistic photo. Four rejected outputs are not public.
- `docs/imagery-manifest.json` preserves old provenance plus final prompts, job IDs, URLs/hashes, dimensions, curation and cost. Raw 2K PNGs and rejected results stay outside Git at `E:/ai work/Artifacts/embarazo.2.1/2026-10-16/design/sources` and related evidence folders.
- Full converter state is external `design/webimg-full-manifest.json`; restore it before future incremental webimg processing, then compact for release. Old staging scripts with 100/200-credit assumptions are historical: **do not rerun them**.
- The separate repository-wide strict image audit has **103 legacy findings** involving preserved canonical names/format siblings and PWA/OG conventions, plus an unchanged unused 147.2KiB coconut asset. Do not claim that whole audit is clean, or regenerate/rewrite unrelated historical assets from this finding alone.

The legacy `WEEK_ART_STYLE="cutout"` enum remains for compatibility; the new renders use cream studio framing. Weekly revision is `2026-10-16-realistic`, preventing the existing CacheFirst weekly route retaining old art. Cache names and private-route exclusions are unchanged. Real service-worker controlled offline image decoding is an acceptance test; merely seeing `serviceWorker.ready` is insufficient.

## Contracts and operational facts to preserve

Google login, required accounts for personal tracking, explicit unchecked health-data consent, recovery/deletion, account ownership, sync, stored records, database/schema/storage keys, service-worker/offline behavior, installation, notification preferences and clinical measurements are protected. No tracking, new health collection, new medical body copy, premium/paywall, broader family permissions, or database migration was added. All 62 unreviewed food entries remain behind the existing publication gate. Do not publish them because photos are now available.

Weekly information at app `/semana/[n]` remains public; personal tracking requires an account. The friendly current-week number and completed clinical weeks differ by convention (20 weeks completed is the 21st current week); do not change calculations to make these labels artificially identical.

The public website `https://embarazo.com.py/semana/` belongs to **another repository**, `antonmarklundcom/embarazo`, registered at `C:/dev/embarazo`. It is unchanged by this app release. Reusing the accepted images there could be a separate, inexpensive follow-up; inspect that repo's instructions and get scope approval before making a second repository's changes.

Hostinger app domain: `app.embarazo.com.py`, existing Git integration against `main`, Node 22/npm/Next.js. Existing local dependencies were reused (local Next 15.5.25; prior hosting build resolved 15.5.27). Preserve the lockfile/config; a dependency upgrade was not part of the design work. Merging the PR triggers the existing automatic deployment: do not trigger a duplicate upload/manual deployment. Inspect actual install and build logs plus commit/publication before calling a release live. No hosting/environment/DNS/database/cron configuration was changed.

PR145 was already merged/deployed before this work. Four push variables were configured. Owner-created notification cron **`zruO4IQVGQ` runs every five minutes**; a scheduled server run succeeded with due/sent counts of zero. **Actual Android closed-app receipt, tap behavior and opt-out remain unverified.** Browser fixtures and a successful server timer do not establish phone delivery. Do not create another cron or log credentials. No actual Google-owner login or real patient record was used for the design tests.

## Validation and how to continue safely

Required repo sequence: TypeScript → lint → unit → database → content → production build → targeted Playwright. Use existing node_modules and installed browser binaries. Set build fixture `PHOTO_STORAGE_ENDPOINT=https://bucket.example.test` and `NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py` in the local check process only. Use E: task cache/temp. Never print real `.env` contents, secrets or patient data.

Final code: TypeScript and full lint passed; database **122/122**, content **19 files**, and production build passed. The skip-link correction was then linted and rebuilt successfully, including build type checking. Unit full run with two workers: **1726 passed / two timeouts** in unchanged auth files; isolated unchanged `auth.test.ts` and `passwordReset.test.ts` then passed **58/58** with one worker, original assertions/timeouts intact. The earlier unrestricted unit run had six timeouts; retain this honest history rather than calling every initial run green. Local CPU contention is the supported explanation, not a reason to relax auth tests.

Final browser acceptance: 68 original cases plus six notification cases have passing evidence across the complete run and focused reruns. The initial complete run was 62/68; five startup/timing cases passed unchanged serially, and the final public-week offline test passed after settling onboarding. A mistaken intermediate private-account banner expectation was removed from this public route. All original failed/interrupted reports are retained; no claim is made that the initial parallel run was green. Two preview-capture cases also passed. See the release report for screenshots and exact logs. A first 68-test attempt was interrupted after 36 passing checks when the active session changed; it was not a completed passing run. The completed follow-up sequence is described above and in the release report. Scope includes 320/390/1280 layouts, public welcome, account/ownership/safe returns, keyboard shelves/skip link, responsive image decoding/fallback, family, exercises, infant mode, sync, installation and controlled-worker offline weekly images. Browser fixtures do not replace actual mobile Google, Android push or user research acceptance. Use the final evidence, not older pre-image integration counts.

Evidence root: `E:/ai work/Artifacts/embarazo.2.1/2026-10-16/design`. Keep original failed/interrupted logs when rerunning. Do not broaden tests/installations without a concrete failure or new change. Update this dated handoff, the versioned technical docs and the canonical manual/register after substantive work.

## Recommended next plan, in order

1. **Verify the release state first.** Read the final manual/report and inspect Git/PR/Hostinger/live pages. Finish any explicitly pending release step before starting a new feature. Do not repeat the completed image batch or recreate the redesign.
2. **Close real-device acceptance with Anton.** Use an actual installed Android app to verify closed-app notification receipt, notification tap destination and opt-out, plus Google/account continuity, sync and offline reopening. Prepare precise owner steps; record what was actually observed. Do not claim a device result from a fixture, or change working push infrastructure without evidence of a specific fault.
3. **Audit the new experience against real use.** Walk through first welcome → existing account/consent → pregnancy setup → first useful week. Check the next-control task, guide reading, exercise photos, baby mode and family invitation/permissions. Fix concrete remaining spacing/crop/accessibility defects in small reviewable steps. Preserve the approved visual direction; substantial new redesign requires Anton's approval.
4. **Reconcile the launch checklist and open issues.** Inspect current `KNOWN-ISSUES.md`, `docs/decisions-needed.md`, `docs/LAUNCH-CHECKLIST.md` and actual code. Mark only verified completed items. Propose the five next highest-impact items with evidence, dependencies and clear acceptance criteria; do not silently revive superseded September build queues.
5. **Validate value before feature expansion.** The Preggers report recommends immediate weekly value, one useful weekly return loop, practical existing family participation and a small reviewed local content collection. A small consented usability pilot can identify friction without adding tracking. Exact Preggers onboarding/paywall details and causal growth claims remain unverified.

Business proposals stay separate: clinic/educator QR pilots, partner outreach, insurance/referrals, sponsorships, premium/payment changes, analytics, expanded sharing, new clinical content and further paid media each need their own authorization. No outreach or purchase has been made. More features, a community or more frequent notifications are not automatically improvements. Keep the existing free-core policy while validating any optional commercial idea.

For future changes: propose a concrete small scope, preserve unrelated work, implement/test in reviewable steps, create a PR, and obtain approval for substantial new scope or commercial/data changes. The authorization to merge this completed design release does not create blanket permission for unrelated future releases. Keep manual, Git, deployment and actual device acceptance statuses distinct.
