# npm audit review — 2026-09

Pre-existing condition surfaced by deps/2026-09 (already merged): `npm audit`
reported 11 vulnerabilities (4 moderate, 6 high, 1 critical) on the dependency
tree that unit's minor/patch bumps left behind. This unit is the first actual
read of each advisory, not a re-run of the summary line.

## What `npm audit fix` (non-forced) took

3 packages fixed **within their existing semver range** — no `package.json`
edit needed, `package-lock.json` only:

| Package | Before → after | Resolves |
|---|---|---|
| `next` (direct) | 15.5.23 → 15.5.25 | **Critical**: unauthenticated RCE on Windows-hosted servers (GHSA-p293-qw3h-jr36) and unauthenticated RCE in the Image Optimization API via AVIF (GHSA-2xp9-vwfh-vxw4) |
| `sharp` (transitive, next's optional image-optimization dep) | 0.34.5 → 0.35.4 | **High**: libvips CVEs (2026-33327/28, 35590/91) and libheif GHSA-g89c-p67h-r497 / GHSA-2jg2-4ch7-h545 |
| `js-yaml` (transitive) | 4.3.1 → 4.3.2 | **High**: quadratic-CPU `!!omap` resolution (GHSA-5p4m-2wfm-xmqj) and `maxTotalMergeKeys` not bounding empty merge sources (GHSA-2883-xcg3-v3hh) |
| `brace-expansion` (transitive, multiple eslint-plugin copies) | ≤1.1.17 → 5.0.9 | **High**: unbounded-expansion DoS (GHSA-mh99-v99m-4gvg) and the intermediate-array DoS that bypassed the first CVE's mitigation (GHSA-rgw5-rvv9-x895) |

The `next`/`sharp` fix is the important one: `sharp` runs at **runtime**, inside
Next's Image Optimization route, processing whatever image bytes that route is
given. That's the one entry in the original 11 that was both severe and
plausibly reachable in production, and it's now closed by an in-range patch —
no escalation needed for it.

## What remains (8: 5 moderate, 3 high) — all need a major bump, none forced

| Package | Sev. | Direct/transitive | Exploitable in this app | What unblocks it |
|---|---|---|---|---|
| `next` → bundled `postcss` 8.4.31 | high | transitive (next's own nested copy, separate from top-level `postcss` which is already safe at 8.5.26) | Not realistically — PostCSS here only runs through `postcss.config.mjs` for the Tailwind v4 build pipeline (`@tailwindcss/postcss`), at `next build`/`next dev` time. No runtime app code imports `postcss` and no user-submitted CSS or stylesheet uploads exist. The XSS/path-traversal advisories require processing attacker-controlled CSS/source-maps, which this app doesn't do at request time. | `next` 16.3.5, which ships the patched postcss internally. Same next-auth v5-stable blocker DECISIONS.md PR-16 already documents for the Next 15→16 bump — this doesn't add a new blocker, it's one more reason that bump matters once unblocked. |
| `@serwist/next` (direct) + `browserslist` (transitive, pinned exact) | high | `@serwist/next` direct; `browserslist` transitive | Not realistically — `browserslist` here is only consulted by serwist's webpack plugin while generating the service-worker asset manifest at build time. The DoS (unbounded memory via distinct query results) needs attacker-controlled query volume, which isn't reachable from a build step over the app's own fixed config. | Upstream: `@serwist/next` pins `browserslist` to the **exact** version `4.28.6` (not a range) in every 9.x release up to and including the current `9.5.12` (checked via `npm view @serwist/next@latest dependencies`). `npm audit fix --force`'s only offer is downgrading to `9.4.1`, the last release that predates the browserslist dependency entirely — an actual regression, not a real fix. No 9.x release has this fixed yet; only unstable `10.0.0-preview.*` tags exist. This is a "wait for serwist to cut a 9.x patch or stabilize 10" blocker, not one this repo can resolve by bumping alone. |
| `drizzle-kit` (direct, devDependency) → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild` | moderate (×4 entries) | `drizzle-kit` direct dev-only; the rest transitive | Not realistically — `drizzle-kit` is a **devDependency**, invoked only for local migration generation (`db:migrate`/`db:push`); it never ships in the production build or runs in the deployed app. The `esbuild` advisory itself only matters while its dev server is running and reachable from a browser tab pointed at a malicious site — an even narrower window than "someone has drizzle-kit's CLI open." | `npm audit fix --force`'s only offer is `drizzle-kit@0.18.1` — a *downgrade* from the current `0.31.10`, because `@esbuild-kit/*` (deprecated, merged into `tsx`) is only pulled in by newer drizzle-kit minors. The real fix is a `drizzle-kit` release that drops its `@esbuild-kit/*` dependency (or bumps its nested `esbuild`), not something `npm audit fix` can do without moving backwards. |

## No high/critical + realistically-exploitable + no-safe-fix finding

**None.** The one candidate — the critical Next.js RCEs, both runtime-reachable
(one via any request to a Windows-hosted server, one via the Image
Optimization API) — was closed by the in-range `next` 15.5.23→15.5.25 bump
above. Everything left after `npm audit fix` is either build/dev-tooling-only
(not reachable at runtime in this app) or already covered by the Next
16 / next-auth v5 blocker DECISIONS.md PR-16 documents. Nothing here needs
escalation beyond what PR-16 already flagged.

## Verification

`npx tsc --noEmit`, `npm run lint`, `npm test` (101 files / 1181), `npm run
test:db` (40 tests), `npm run validate:content`, `npm run build` (with the
photo/support env vars), and `npm ci` (lockfile self-consistency) all green
after the `npm audit fix` bump. No application code touched; only
`package-lock.json` changed.
