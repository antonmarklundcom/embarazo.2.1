# Transactional email setup

## Live infrastructure check — 15 October 2026

Cloudflare DNS and Email Routing are active while both websites remain hosted at Hostinger. Public root routing MX/SPF/DKIM and the separate cf-bounce sending records were verified. The owner confirmed the support-alias forwarding test reached Inbox; an earlier direct outbound test reached Spam. Those two infrastructure messages do not establish a dependable delivery rate or application verification/reset acceptance.

A dedicated account token with Email Sending Write only was created with owner approval. The owner saved the four Cloudflare environment variables privately in Hostinger; masked key presence was confirmed on 15 October. Preserve all existing Google/auth/database variables. Never put the sending token in public variables, Git, logs, or chat, and never install the short-lived Wrangler OAuth token as an application credential.

The owner-triggered rebuild completed at 20:28:22 UTC on 15 October but rebuilt old commit 390cbbaa. The Cloudflare adapter is in newer main 209fe9f. Hostinger's Git connection now points to this repository's main branch with auto-deployment enabled. Publish the font fix, merge the reviewed release PR, then verify the new deployed revision before testing real confirmation/reset messages. Rebuilding the old commit does not activate the new adapter.

The font fix bundles Nunito Sans under public/fonts and loads app/fonts.css, avoiding Hostinger's next/font Google loader failure. It changes no auth, database, schema, or email-provider behavior. Owner resource IDs and dated live evidence remain in the local operations manual. No new email signup or registration-only route policy is enabled by this release patch.

Mi Bebé uses server-side HTTPS for email confirmation and password-reset messages. Google sign-in does not depend on this transport. Existing installations keep Resend when EMAIL_PROVIDER is empty. Set EMAIL_PROVIDER=cloudflare only when Cloudflare Email Sending is available for the account and its sending domain is configured. Email Routing by itself does not provide this outbound integration.

## Environment variables

- Resend: RESEND_API_KEY, optionally RESEND_FROM_EMAIL.
- Cloudflare: EMAIL_PROVIDER=cloudflare, CLOUDFLARE_EMAIL_ACCOUNT_ID (32 hexadecimal characters), CLOUDFLARE_EMAIL_API_TOKEN (account-scoped Email Sending permission), and CLOUDFLARE_EMAIL_FROM (a plain sender address on the configured domain).
- Both: NEXT_PUBLIC_APP_URL must be the actual public app origin so confirmation/reset links reach the app. DATABASE_URL and the account backend must already be configured for those flows.

Keep API tokens in the hosting platform's server secret settings. Never add NEXT_PUBLIC_ to their names, commit them, or put them in a support message. The sender defaults to no-reply@embarazo.com.py; the operator still needs to configure that domain with the selected provider. A public support address remains a separately monitored inbox.

## Owner setup and verification

1. Inspect existing mail records before changes. Activate Email Sending in the existing Cloudflare account if entitled, configure the domain and verify the sender. Confirm available beta access, quotas and pricing in the account before enabling it.
2. Create a least-privilege API token, set server environment variables, and restart/redeploy using the normal app workflow. A malformed account id, unknown provider, or missing token leaves the transport unavailable. Selecting Cloudflare never falls back to Resend.
3. With an account you control, request a confirmation and password-reset message. Confirm delivery in the inbox/spam folder and follow each link once; a second use should fail. Check the final app origin, sender and expiry wording. Do not test with another person's address.
4. Check the provider delivery log without exporting credential URLs or user addresses into repository logs. A queued message has been accepted, but inbox delivery is still unconfirmed. Investigate later bounces/suppressions in the provider console.

Cloudflare responses are accepted only when success is true and the intended recipient appears in delivered or queued, and does not appear in permanent_bounces. A successful HTTP status alone cannot make the app say a bounced message was sent. Provider/network/parse errors produce generic errors without logging tokens, email bodies or provider responses. The request has a ten-second timeout; retries should be requested explicitly through the already rate-limited user flow.

To return to Resend, set EMAIL_PROVIDER=resend (or unset it), retain the verified Resend configuration, and redeploy. No schema migration or dependency installation is necessary.

## Sources and checks

Official API contract: https://developers.cloudflare.com/email-service/api/send-emails/rest-api/

Run the focused check: node node_modules/vitest/vitest.mjs run lib/server/email.test.ts

Run the app's existing confirmation/reset tests as part of release verification. Mock tests validate configuration and response handling; real delivery and sending-domain entitlement remain owner checks.
