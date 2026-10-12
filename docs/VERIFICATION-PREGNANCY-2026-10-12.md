# Pregnancy release verification — 12 October 2026

Release candidate on codex/pregnancy-launch-20261011. App base390cbbaa57b11cebc1576d2eb5f3114546fc2071; website base daf3dc52cedcb8e6390c154968e70c50a5184636. Git/PR/merge/deployment status is recorded in the owner operations manuals; local checks do not prove deployment. No signed Android package or Play listing exists.

## Current results

- PASS full TypeScript noEmit/incremental false and complete ESLint on the final real-code changes.
- PASS full unit suite150 files/1712 tests.
- PASS full IndexedDB suite11 files/122 tests, including a new stalled-service-worker/remote-publication appointment-save regression.
- PASS content validator19 files;42 clinical length/weight tuples and development text retained. This is not clinical review.
- PASS Next15.5.25 production build with bundled service worker. Existing dependencies reused; no installation.
- Browser acceptance205 scenarios: full run201pass/4fail, all four traced to stale test expectations (optional Google heading, ambiguous tabpanel, tool grid before hydration). Test-only corrections followed by11/11 successful cases across affected files, covering all205 distinct scenarios successfully across runs. Do not represent this as one clean full-suite execution.
- Additional sync/appointment13/13 PASS. Required-account entry, owner mismatch, authenticated FUM arrival, offline grant revocation, deletion/restore/photo ownership, family, timers/birth, comparison/theme and public emergency/privacy flows covered with synthetic fixtures.
- PASS website source and curated public package:155 routes/129 unique indexable pages/718 JSON-LD blocks/5957 internal links/139 fragments/zero orphans or diagnostics.10 date/export tests and42-week freshness pass.20 actual390/1440px renders with no overflow/JS errors; explicit week selection and fragment calculator handoffs verified.
- No new MySQL migrations: drizzle SQL/metadata, server schema/database handle and migration scripts unchanged against deployed base. Dexie version/store/upgrade declarations unchanged. Production migration history is not read or modified.

## Regression fixes after the first local commit

Account gate waits for its initial owner read before mounting private forms; calculator handoff is saved before its URL is stripped. Local appointment saving finishes without waiting indefinitely for service-worker installation or network publication. Unknown exercise IDs return404. Privacy has an explicit account-deletion link. Browser helpers wait for each distinct onboarding screen, handle signed-in invitation and enforce account mismatch; measurement panels are scoped to their own card.

## Google and live acceptance boundary

Dedicated project mibebe-paraguay-2026 and External testing consent are created with owner-approved Google policy/support email antonmarklund.com@gmail.com. Production web client created with only https://app.embarazo.com.py/api/auth/callback/google. Owner privately saved both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET; key presence confirmed through masked Hostinger readback. Replacement secret generated on same client after the original dialog was lost; unused original remains enabled pending successful rotation verification. No values logged or written.

Old-source Hostinger rebuild01a1310b-3254-710e-b099-cb0f8e570fb7 completed12October13:57:54Asuncion, main390cbbaa. Fresh live root/cuenta loads and Google button is present. Owner's temporary root loading error was not reproduced and later resolved for him. Actual Google sign-in, MySQL sync/deletion, object storage and installed-phone acceptance remain unverified. Public product support alias soporte@embarazo.com.py is not yet operational; do not invent an active mailbox. No DNS/provider/billing/AI changes.

Local preview disables required-account mode only with no configured public deployment URL; dedicated tests force accountRequired true. Never deploy the preview flag. New-source merge and deployment must be verified separately from this old-source rebuild.

## Evidence

E:/ai work/Artifacts/embarazo/2026-10-12: app-release-lint.log, app-release-unit.log, app-release-db.log, app-release-build.log, app-browser-final-release.log, app-final-expectations-followup.log, app-sync-agenda-regressions.log. Earlier failure logs retained. Owner manuals C:/operation manuals/embarazo.2.1/README.md and embarazo/README.md; CLAUDE-TAKEOVER.md has dated continuation history.

Website public ZIP embarazo-2026-10-12-reviewed.zip:740 files/~13MiB/SHA2565723E8A178764260A7AF1FFFF98A276DDFABE10ABE274593175C6799CFCFC15C. Public shipping manifest, minified CSS and exclusions verified; no credentials/app source. E working copies and artifacts share one device-failure risk. No backup/cleanup schedule enabled.