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
