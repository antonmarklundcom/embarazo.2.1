# Unit V1 — enforce the Content-Security-Policy. OPUS session. No dependencies.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-11.md` §1–§2, `docs/BUILD-QUEUE-2026-09-06.md` §4,
`next.config.ts`, `lib/invariants/middleware.test.ts`, `e2e/security-headers.spec.ts`, `app/sitemap.ts`,
`app/sw.ts` (what it fetches), `lib/server/photoStorage.ts` (the presigned PUT host), `app/(app)/guias/[slug]/page.tsx`
(the one `dangerouslySetInnerHTML`). Execute under the autonomy protocol.

Owns: `next.config.ts` · `e2e/csp.spec.ts` (new) · `lib/invariants/csp.test.ts` (new) · `e2e/security-headers.spec.ts`
(extend) · `docs/log/v1.md`.

Decision already made (do not reopen): the enforced policy is the current `CSP_REPORT_ONLY` list with
`script-src 'self' 'unsafe-inline'` kept as the residual and the Report-Only header removed. No `middleware.ts`.

Build:
- Move the policy to `Content-Security-Policy` (merge with the existing `frame-ancestors 'none'` header — one
  CSP header, not two). Delete `Content-Security-Policy-Report-Only`. Keep every other K14 header byte-identical.
- Tighten what can be tightened without a nonce: `connect-src` and `img-src` list the actual hosts (Google/Facebook
  avatar CDNs, `youtube-nocookie.com` for the video embeds via `frame-src`, the object-storage endpoint read from
  `PHOTO_STORAGE_ENDPOINT` at build time, `https:` only where a host is genuinely unknown). `worker-src 'self'` for
  the service worker. Comment each source with the feature that needs it, as the file already does.
- `lib/invariants/csp.test.ts`: reads `next.config.ts` as text; asserts no Report-Only header exists, the enforced
  header contains `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and `script-src` has no `*`.
- `e2e/csp.spec.ts`: against the production build, visit `/`, `/conoce`, every URL in the sitemap, `/offline`,
  `/cuenta`, `/ajustes`, `/herramientas/*` (walk the tools grid), `/admin` (404 path) with a listener for
  `securitypolicyviolation` events and console errors; assert zero violations. Then exercise the flows that load
  third-party or blob content: a photo upload in `/herramientas/fotos` (blob: URL), the video gallery locked tile,
  onboarding, the share card render. Any violation is a policy fix, never a test relaxation.
- Run the full Playwright suite once at the end; it is the broadest CSP probe the repo has.

Exit: gates green; `curl -sI` on the production build shows exactly one `Content-Security-Policy` header and no
Report-Only header; `e2e/csp.spec.ts` green with zero violations; full e2e green. Open the PR that turn; write
`docs/log/v1.md` (list every source you added and the feature that needed it). Then continue per the run file.
