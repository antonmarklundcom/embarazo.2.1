# Signup conversion and login incident — 15 October 2026

Owner subsequently authorized a follow-up PR, validation, merge and deployment of these copy/UI/diagnostic changes. This release does not claim to fix login. The dated owner manual records the resulting PR, source SHA, Hostinger build and live acceptance; the initial preparation/validation record below is retained. A full-suite diagnostic rerun uses an explicit30s local timeout allowance for slow external-drive scans, without changing committed timeout settings; do not describe it as the default5s gate or green CI.

## Production incident

Live main12f727a built successfully on Hostinger with Node22/Next15.5.27. This does not establish working login. Owner reports Configuration error immediately after pressing Google, before choosing an identity. Reproduced in the in-app browser: the real account form briefly shows pending, then returns to /cuenta?error=Configuration.

Anonymous /api/auth/providers and /api/auth/session respond200. A clean-session CSRF-protected POST to /api/auth/signin/google returns an authorization URL on accounts.google.com; no Google identity was selected by the agent and no account or health data was created. The owner subsequently reached Google and completed phone authentication in fresh Chrome, but returned to Configuration. Therefore both request/session initiation and callback/account persistence need examination; a working anonymous redirect does not prove callback, database or client-secret exchange. No database migration is identified as the fix. Domain resolution is working for these requests; nameserver delegation is not an evidenced cause of this application error.

Hostinger runtime API returns no structured entries, even though raw line count is nonzero. Requested the latest hPanel [auth][error] name and cause code only. Do not paste credentials, auth codes, state/PKCE values, full URLs, SQL/query parameters or user records. Do not rotate secrets, weaken consent or automatically link accounts to try to bypass an unidentified failure.

Owner confirms hPanel logs are also empty. Prepared a custom Auth.js error logger emitting a timestamped structured JSON line, with allowlisted auth type and nested database/network/OAuth code only. Arbitrary messages, stacks, queries, addresses, request URLs and credential objects are not serialized. Unknown values become UnknownAuthError/UNCLASSIFIED. Unit tests cover private-field exclusion, known nested database errors, missing inputs and bounded circular causes. This is observability, not a proven login fix; it needs an approved release and one controlled retry before diagnosing the underlying cause.

## Prepared changes, not deployed

Both signup entrances now lead with personal pregnancy tracking, controls/questions, symptoms/mood/weight, diary/checklists, synchronized records and chosen family sharing. General guides remain reachable as a secondary text link; emergency access and the existing registration policy are unchanged. Benefit copy refers to implemented features, not clinical guarantees or unconfigured notifications. Explicit health-data and photo consent wording is unchanged.

The main account Google button previously lacked onboarding's enabled hover/focus styles. Both now use the same Google colors, hover/press/focus/disabled feedback, pending text, aria-busy and motion-safe loading indicator. Reduced-motion users still receive text feedback without spinning/scaling. After an error the checkbox resets; the UI now explicitly asks for consent again before retrying. A disabled button intentionally has no hover/press animation. No looping promotional animation was added.

Regression coverage: component rendering for both signup entrances, consent-disabled state and matching interaction classes; browser account-entry assertions for the new benefits. Validation results and live state belong in the dated owner operations manual.

## Validation of prepared changes

- TypeScript noEmit: PASS before the diagnostic addition; final production build also completed type/lint checks with diagnostics included.
- Full ESLint: PASS; final changed-file ESLint: PASS.
- Focused signup rendering, server-action consent and redaction tests: PASS14/14.
- IndexedDB: PASS122/122; content validator: PASS.
- Local production build: PASS109 pages, existing Node24/Next15.5.25 dependencies reused. Hosting lockfile uses Node22/Next15.5.27; no fresh install performed locally.
- Related Chromium account-entry/account/onboarding: PASS29/29.
- Full unit gate: FAIL. The unchanged Guaraní review scan exceeded5 seconds, also on isolated retry. The initial new component suite exposed preserved-JSX test configuration; adding the installed Vite Oxc automatic JSX transform and correcting attribute-order-dependent assertions resolved that suite in the focused run. No unrelated timeout threshold or Guaraní source/test was changed. No clean single full-unit run claimed.
- Diff whitespace check: PASS. No commit, push, follow-up PR, merge or production deploy at this handoff; owner release approval pending.

## Release acceptance

1. Obtain the actual server error code; fix the evidenced cause without exposing private diagnostics to the client.
2. Verify the real form reaches Google in a fresh browser and when retrying after an error; owner completes identity selection.
3. Confirm callback/session, account-bound onboarding and the email recovery path separately.
4. Review and release the prepared copy/UI changes; verify the deployed source SHA before retrying. No claim of a login repair or email delivery until observed.
