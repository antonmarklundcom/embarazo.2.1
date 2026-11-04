# Perf budget (W6)

`npm run build && npm run perf` runs Lighthouse (mobile preset, default
throttling) against a production server, 3 runs each for `/`, `/semana/20`,
`/herramientas`, `/guias`, and checks the **median** of each metric against:

| Metric | Budget | Why |
|---|---|---|
| Performance score | ≥ 90 | Lighthouse's own pass line; below it flags a real regression, not noise. |
| LCP | ≤ 3.5 s | **Current fallback-hero reality, not the goal.** The home and week screens render a placeholder hero until image assets land; the ceiling is set to what that hero can hit today. The goal moves to **2.5 s** the day U10's real hero renders ship — tighten this number then, don't leave it at 3.5 s out of habit. |
| CLS | = 0 | No layout shift is acceptable; the app has no excuse (no ads, no late-loading web fonts above the fold). |
| TBT | ≤ 200 ms | Keeps the four screens interactive quickly on a throttled mobile CPU. |

The script exits 1 and prints every failing `<url, metric, value>` triple on
a miss. It writes one JSON summary per run to `docs/perf/` (git-ignored —
these are point-in-time local measurements, not something to diff in review).

## Running it

```
PHOTO_STORAGE_ENDPOINT=https://bucket.example.test \
NEXT_PUBLIC_SUPPORT_EMAIL=hola@mibebe.example.py \
npm run build
npm run perf
```

Uses `/opt/pw-browsers/chromium` when present (CI), otherwise lets
Lighthouse launch its own Chrome. This is a **session gate, not a CI step**
(decided in `docs/BUILD-QUEUE-2026-09-11.md`) — Lighthouse numbers are too
noisy under shared-runner CPU contention to gate a merge on; run it locally
before a perf-sensitive PR.

## Baseline

See `docs/log/w6.md` for the measured medians this unit recorded and the
machine conditions they were taken under.

## Night run 2026-11-04 (item 8) — measured, budget not tightened

Change: `/` now paints Hoy's hero frame (`components/home/HomeHeroShell.tsx`)
while the client account check is in flight, instead of one line of text;
`next.config.ts` gained `images.formats` AVIF/WebP and a one-year
`minimumCacheTTL`.

What `npm run perf` can and cannot see: it runs signed out against a build
that requires an account, so `/` and `/herramientas` end on
`/cuenta?returnTo=…` and their LCP is the sign-in screen's. The hero shell only
paints for somebody whose check is still running, which this harness never is.
The numbers below are therefore not evidence for or against the shell.

| Run (same machine, medians of 3) | `/` LCP | `/semana/20` LCP | `/herramientas` LCP | `/guias` LCP |
|---|---|---|---|---|
| Before the change | 4594 ms | 2965 ms | 4333 ms | 2969 ms |
| After, `npm run perf` | 3201 ms | 761 ms | 3010 ms | 3283 ms |
| After, without the `images` block | 3185 ms | 758 ms | 3122 ms | 3137 ms |
| After, single direct Lighthouse runs | 4552–4568 ms | — | 4335–4336 ms | — |

The direct runs reproduce the old bimodal 4.5 s on the same build that scored
3.2 s under `npm run perf`, so the drop is machine load, not the change.
`perf` also reported CLS 0.0093 on `/` and `/herramientas` in both "after"
runs, and 0 in the direct runs; not reproduced, not chased. **Budget left at
3.5 s**: no measurement here earns a tighter number. Measuring the shell needs
a signed-in Lighthouse run (a stored session cookie), which this harness does
not have.
