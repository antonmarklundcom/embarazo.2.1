# Mi Bebé pregnancy launch — 12 October 2026

Implementation branches: codex/pregnancy-launch-20261011 in the app and website. These changes are prepared locally; a saved branch, passing tests and a preview ZIP do not prove deployment. See the dated verification report for final results.

## Product focus

App: a pregnant mother's daily companion. Lead with her week and approximate baby measures, next prenatal appointment, quick safety/record tools, one useful daily tip, then reading and family. Keep trying-to-conceive material useful on embarazo.com.py; it is not the primary app onboarding pitch. Avoid adding a feature unless it improves reassurance, preparation or a repeat weekly habit.

Website: answer a searcher's actual question before offering a relevant app handoff. Weekly pages, due-date tools, hospital bag, prenatal care in Paraguay, IPS/public/private navigation and maternity rights are the strongest entry points. Require her to choose a week; never imply a generic week20 is personal. Transfer calculator dates in a fragment, keep them on this device through Google login, and let her confirm them in onboarding.

## Implemented release scope

- Google-first required account for private tracking, with existing email/password access retained. Public weekly/guide/emergency/legal/FAQ/deletion pages remain reachable. Offline use requires a recently verified grant bound to this device's account. No new password signup is advertised; no WhatsApp OTP costs.
- Sanitized local return destinations; onboarding finishes before opening a requested private tool. No FUM/FPP in OAuth URLs. Account mismatch blocks access rather than merging somebody else's records. Cross-provider automatic linking is disabled.
- Frutas/Medidas choice uses the existing profile preference. Familiar individual fruits, explicit illustration/no-scale captions and length-versus-weight references; week3 microscopic. All clinical cm/g and development text are preserved. Website sizes use the same versioned42-week contract.
- Cloud account deletion verifies the expected account, waits for the server acknowledgement and confirmed sign-out, then clears only the matching phone data; failures preserve recoverable records. Emergency-contact-only profiles cannot skip pregnancy setup. Public week readers can change Frutas/Medidas without creating a tracking profile. Sync/photo writes bound to account; remote photo-deletion obligations preserve the original owner. Local wipe pauses writers, ends and confirms the session, then removes phone data. It does not delete the cloud account. Backup restore preserves PIN/data when localStorage writes fail.
- Timers persist unfinished sessions and resume. Contractions do not claim an observed hour from six contractions over25minutes. Premature birth can be recorded in settings; date validation rejects impossible dates. Emergency context changes after birth, with distinct mother/newborn warning signs and actual infant age.
- Real terms replace the duplicated privacy page. Operator is Marklund Sales & Marketing AB; Mi Bebé remains the product brand. Privacy states actual synchronization, PIN limits, pending photo deletion, third-party processing and no end-to-end encryption.
- Public community Q&A is closed until reporting, publication consent, rules and moderation are ready. Existing records/admin review are preserved. Authored FAQ remains public.
- Optional Cloudflare Sending HTTP transport is implemented alongside existing Resend; see EMAIL-DELIVERY.md. No email provider purchase, credential configuration, DNS change or AI enablement is implied by this code.
- Website mobile hierarchy, contextual CTAs, explicit week picker, useful Paraguay prenatal guide with source URLs, comparison consistency, schema operator and truthful installation copy. Existing canonicals/redirects/indexable routes preserved.

## Google setup and deployment sequence

Dedicated Google Cloud project created 12 October 2026: Mi Bebe Paraguay, ID mibebe-paraguay-2026, number 1057561699978. Support for Google consent screen temporarily uses the owner-approved antonmarklund.com@gmail.com. Preferred product address: soporte@embarazo.com.py, routing to antoninparaguay@gmail.com after the destination is verified. Do not advertise a non-working alias.

External testing consent named Mi Bebé has been saved with owner-approved policy acceptance. Request only openid/email/profile. Website https://embarazo.com.py; privacy https://app.embarazo.com.py/privacidad; terms https://app.embarazo.com.py/terminos. Authorized domain embarazo.com.py. Verify ownership/branding if Google requests it; do not request Gmail/contact/Drive scopes for basic login.

The production Web application OAuth client has been created. Both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are saved in Hostinger (masked key presence verified); real Google sign-in is still an acceptance task. No new database migration is required for this release. Hostinger rebuilds main when the owner saves an environment variable; its Redeploy button is reportedly unreliable. Exact production redirect: https://app.embarazo.com.py/api/auth/callback/google. Optional explicit local client redirect: http://localhost:3000/api/auth/callback/google. Add origins only where needed. Store AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET privately in Hostinger; preserve DATABASE_URL, AUTH_SECRET and the other environment settings. Never use a replace-all operation with masked secret values. AUTH_URL is the actual production app origin. Local preview AUTH_REQUIRE_ACCOUNT=false is forbidden in a configured deployment.

Before deployment: inspect current hosting build/revision; preserve recoverable source/config. Apply the verified app/website release together, verify Google sign-in with a real test account and a second device, sync ownership, photo opt-in/out where configured, backup restore, account deletion, offline reopen, and homepage/calculator handoffs. No app data migration should be invented to make a demo work.

## Google Play

Use the Swedish AB if it is the actual publisher and its records can be verified. The legal company name need not match the product brand. Google requires an organization account for health apps; do not choose a personal account to bypass entity verification. Obtain/verify D-U-N-S and consistent legal name/address/phone/email. The fee is US$25 once. A later transfer to a Paraguayan company needs an eligible verified target account and a proper transfer; it is not an informal country switch.

For general personal-account questions: new personal accounts have a production-access gate of at least 12 testers continuously opted in for 14 days. The requirement is continuous opt-in, not opening every day; meaningful testing/feedback still matters. This does not make a personal account the right publisher for this health app.

Prepare a signed TWA/AAB after the web release is healthy. Verify current target API requirement (36 at this check), package name, signing/upload keys, exact assetlinks.json fingerprints, internal test, screenshots, health-app declaration, accurate Data Safety, accessible deletion/privacy URLs and reviewer access instructions. An organization account removes the specific new-personal-account tester gate; it does not remove app review or the need to test.

Primary sources checked12 October 2026:
- Fee: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en
- Testing: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- Organization health-app policy: https://support.google.com/googleplay/android-developer/answer/18258653?hl=en
- Organization verification: https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
- Transfer: https://support.google.com/googleplay/android-developer/answer/6230247?hl=en
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
- OAuth: https://developers.google.com/identity/protocols/oauth2/web-server

## What still deserves product work

1. Recruit a Paraguay-based obstetric reviewer for exact priority content; source links and a disclaimer are not clinical approval. Review local jargon/Guaraní with a native speaker before enabling it. Verify emergency contact availability on actual phones.
2. Add a compassionate pause/archive/loss flow with a pregnancy identity model before changing sharing and reminders. Do not bolt a generic switch onto ongoing family snapshots.
3. Design the post-birth handoff around mother's recovery, feeding preparation and appointments. Let her choose when to move into the next product; do not turn the birth moment into a forced sales funnel. Companion post-birth data sharing still needs explicit contract design.
4. Verify Google Search Console ownership and submit the sitemap; monitor search clicks, useful tool completion, app opens, onboarding completion and seven-day use separately. No invented SEO growth guarantees. Prioritize source refreshes and internal links over bulk thin AI articles.
5. Populate only real local providers/events and marked sponsorship. Build reporting/moderation before opening community questions. Keep paid product promotions below care tasks and separate them from health-data targeting.
6. Run a short real-user round with the girlfriend and other pregnant mothers: find today's week, set a control, change Frutas/Medidas, reopen offline, record birth, export/restore, sign out and request deletion. Record friction before adding more features.
