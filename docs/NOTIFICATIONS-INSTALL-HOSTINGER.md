# Notifications and installation — 15 October 2026

This release prepares the existing Web Push infrastructure and improves its opt-in feedback. It does not activate infrastructure, migrate production tables, send production notifications or deploy itself. Installation and QR codes work without VAPID. Both local QR SVGs encode only https://app.embarazo.com.py/; no identity, pregnancy data or third-party QR endpoint is involved. QR assets were generated using qrcode and independently decoded using ZXing; they are static assets, not runtime dependencies.

## Hostinger owner setup

In app.embarazo.com.py → Node.js → Environment variables, ADD these four variables while preserving every existing variable:

| Variable | Value |
| --- | --- |
| VAPID_PUBLIC_KEY | Public half of one generated P-256 VAPID keypair |
| VAPID_PRIVATE_KEY | Private half of the same keypair; keep private |
| VAPID_SUBJECT | mailto:soporte@embarazo.com.py (only while this forwarding address remains monitored) |
| PUSH_DISPATCH_SECRET | A separate cryptographically random bearer secret, at least32random bytes |

Generate a VAPID pair privately on your trusted computer, for example with the official web-push package CLI: `npx web-push generate-vapid-keys`. Do not run this in a shared/logged build, paste private values in chat or commit them. Generate the dispatcher secret separately with a trusted password manager. No values have been generated or stored by this PR. Keep the pair stable: changing it can require devices to subscribe again. None of these secrets needs a NEXT_PUBLIC_ prefix. Redeploy/restart after saving. Do not replace masked API values with literal asterisks.

Before enabling signups for notifications, verify the existing database migrations provide pushSubscriptions and pushReminders (see lib/server/schema.ts and the versioned Drizzle migrations). A working Google login alone does not verify these tables. Back up before any necessary reviewed migration; do not blindly apply schema push or destructive SQL.

Create a private scheduled task that POSTs every5minutes to https://app.embarazo.com.py/api/v1/push/dispatch with header `Authorization: Bearer <the same PUSH_DISPATCH_SECRET>`. It must be POST, not a browser GET or unauthenticated uptime ping. Hostinger cron does not automatically inherit the Node.js app's environment variables: supply the secret privately in the cron job or a protected wrapper/config outside public_html. Never put it in the URL, public PHP, source or logs. Example shape only:

```sh
curl --fail --silent --show-error --max-time 45 --request POST --header 'Authorization: Bearer <PRIVATE_DISPATCH_SECRET>' https://app.embarazo.com.py/api/v1/push/dispatch
```

Schedule: minute */5, every hour/day/month/weekday. Cron is required even when VAPID is configured; otherwise subscriptions can save but scheduled messages never send. Inspect private counts-only responses/failures; no device endpoints, headers or user content in operational reports. Dispatch also runs the existing housekeeping function, so use the intended production scheduler only, not an aggressive test loop. No Cloudflare DNS or Email Routing changes are required.

## Acceptance

1. GET /api/v1/push returns200with a publicKey (never a private key); a missing setup returns404.
2. On an actual Android phone, complete profile/account setup, choose weekly notices, then accept the browser prompt. The app must show confirmed success only after the subscription is stored; failed/pending saves are not success.
3. On iPhone/iPad, open the app in Safari, Share → Add to Home Screen, keep Open as Web App enabled if shown, then launch the installed icon and opt in. OS/browser permission and existing account login are separate.
4. Confirm only consejos is selected for a new weekly-only consent. Existing category choices and companion appointment schedules must remain unchanged. Other categories are separately chosen in Ajustes.
5. With synthetic/non-health test data and explicit device-owner permission, arrange a near-term test reminder through a reviewed test procedure, run the scheduler once, close the app and confirm the actual OS notification arrives and opens the correct screen. Local mocks cannot establish real Web Push delivery. Do not modify somebody's real appointment to force a test.
6. Decline, dismiss, offline, unconfigured and install-required cases must explain the outcome and allow continuing without notifications. Timeout means activation could not yet be confirmed, not that a late operation was cancelled.
7. Turn notifications off and confirm future sends stop. Test sign-out/shared-device handling separately. Browser/device policies and connectivity can delay messages; do not market reminders as guaranteed clinical alerts.

## Website and app

The website /instalar/ prioritizes detected instructions, honors explicit #android/#iphone links and retains manual choice. Desktop shows a local QR and both guides; no-JS visitors retain the guides/QR. The app home/settings card also offers manual choice and desktop QR, uses a native install prompt only where the browser exposes it, and hides in installed standalone mode. Device detection is a convenience, not an access restriction. Real iOS/Android hardware testing remains required.

## Local validation

TypeScript, full ESLint, full1725-unit/154-file suite at unchanged default timeouts, IndexedDB122, content and production109-page build PASS. Chromium12/12 covers installation/manual choice/standalone hiding, funnel behavior, declined/unconfigured/confirmed/pending notification outcomes and iPhone install-required handling. Mocked push acceptance verifies only client/server interaction handling, not Google/Apple push infrastructure. Static QR SVGs independently decode to the expected public root using ZXing. Existing local Next15.5.25 dependencies were reused; Hostinger lockfile resolves15.5.27, so deployment verification is still required after an authorized merge. No merge, production deployment, private key generation, Hostinger environment change or scheduler creation occurs in this PR.
