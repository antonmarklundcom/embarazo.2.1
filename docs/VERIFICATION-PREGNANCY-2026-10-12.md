# Pregnancy release verification — 12 October 2026

Prepared on codex/pregnancy-launch-20261011. App base 390cbbaa57b11cebc1576d2eb5f3114546fc2071; website base daf3dc52cedcb8e6390c154968e70c50a5184636. Local commits are recorded in the owner manuals and external implementation report. Nothing has been pushed, merged or deployed; no signed Android artifact or Play listing exists.

## Results

- PASS TypeScript noEmit/incremental false and complete ESLint; final production build also checked types/lint after the contact-only-profile/public-comparison fixes.
- PASS full unit suite: 149 files / 1,709 tests before the final small onboarding predicate; subsequently 39 focused access/onboarding tests across three files passed including its three new cases.
- PASS full IndexedDB suite: 10 files / 121 tests, including ownership races, cloud deletion, PIN/localStorage restore failures and comparison preference. Later focused database checks passed 11 cases after preference fallback.
- PASS content validator: 19 files. Forty-two clinical length/weight tuples and development text preserved. This does not establish clinical review.
- PASS final production build, Next 15.5.25; service worker bundled. Existing dependencies reused, no installations.
- Final built-browser coverage: 70 distinct scenarios passed across the final batch and focused follow-ups. Covers account gate/identity/offline revocation, onboarding/tool return, account deletion confirmation, home, companion/family, timers/birth, fruits/measures/theme, public emergency and FAQ/privacy.
- Browser run history is preserved: an earlier 71-case run had 65 pass / 6 fail (stale expectations plus a real legacy deletion redirect race, fixed); final 67-case batch had 64 pass / 3 fail (exact accessible-name selector, fixture IDB readiness, one companion-loading timeout). A sequential 23-case follow-up passed the account/companion/emergency cases but found two stale FAQ assertions. Both FAQ tests then passed with actual sync/PIN/privacy/deletion expectations. No app changes after the final successful build; subsequent corrections were test-only.
- PASS browser visual review at 390px: week 40 fruit card, approximate weight/clinical length separated, no-scale caption, and working measures choice. Screenshot mibebe-week40-mobile.png in the external report folder.
- PASS website source and curated public package: 155 routes / 129 unique indexable pages / 718 JSON-LD blocks / 5,957 internal links / 139 fragments / zero orphans or diagnostics. Ten date/export tests and 42-week contract freshness pass. Actual Chrome renders at 390/1440px: 20 screenshots, no horizontal overflow/JS errors; week select/clear and FUM/FPP fragment handoffs checked.
- PASS diff whitespace checks. Final test-only files linted separately.

## Real deployment boundaries

Browser identities/API responses use synthetic local fixtures; no real Google login or production database/object-storage writes were performed. A local preview explicitly disables the required-account gate only with no public deployment URL; dedicated account-entry tests force accountRequired true. Do not deploy that preview flag. Real MySQL integration/admin/Google consent/photos/mail/offline phone installation/update/reviewer access remain unverified.

Dedicated Google project mibebe-paraguay-2026 was created; consent/API policy acceptance and web OAuth client are pending. AUTH_GOOGLE_ID/SECRET were absent from inspected hosting env names. Approved consent support email is antonmarklund.com@gmail.com. The preferred domain support address is not operational; no domain/messaging/billing change was made.

The live embarazo.com.py homepage already links to https://app.embarazo.com.py/, currently the earlier web release. Do not claim tonight's source is live. Real Google sign-in, cross-device sync/export/restore/deletion, Android/iPhone/offline/update acceptance, professional clinical review and signed Play release are still required.

## Evidence and package

External folder: E:/ai work/Artifacts/embarazo/2026-10-12. Full unit/db/build/browser logs remain there. app-browser-tests-verified.log, app-browser-tests-followup.log and app-faq-tests-verified.log explain final results; the earlier failure log remains for traceability.

Website public ZIP: embarazo-2026-10-12-reviewed.zip, 740 files / about 13 MiB, SHA256 5723E8A178764260A7AF1FFFF98A276DDFABE10ABE274593175C6799CFCFC15C. Native packaging substituted for deploy/make-zip.sh because the existing PC lacks zip; same public shipping manifest, minified CSS and exclusions, then full stage verification. It does not contain deployment credentials or app source.

Owner manuals: C:/operation manuals/embarazo.2.1/README.md and embarazo/README.md. Snapshots are deliberate non-secret documentation captures; E source/artifacts share one device-failure risk. No backup/deletion/cleanup schedule was enabled.