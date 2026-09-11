# Build queue — 2026-09-11 (improvement pass, after the Fable review)

The executable version of `docs/IMPROVEMENT-REPORT-2026-09-11.md`. It
continues `docs/BUILD-QUEUE-2026-09-06.md` — same method, same autonomy
protocol (that file's §4 applies verbatim), same runner shape. Two windows:
Opus first, Sonnet second. Fable runs nothing (`fable-cost-guardrail`).

## 1. Decisions already made — do not re-litigate

Everything in `docs/BUILD-QUEUE-2026-09-06.md` §2, plus, from the report:

- **CSP is enforced, not report-only.** `script-src 'self' 'unsafe-inline'`
  stays as the documented residual; no `middleware.ts` for a nonce (the
  no-middleware invariant wins). `Content-Security-Policy-Report-Only` is
  removed, not kept beside the enforced header.
- **Server modules are unit-tested through a backend interface**, the A3
  `SyncBackend` pattern (`lib/server/sync.ts` + `sync.test.ts`). The
  text-assertion `routeContract` tests are kept, not replaced.
- **Dexie is unit-tested under `fake-indexeddb`** in a second vitest
  project; upgrade paths are pinned from the oldest version still in the
  `MiBebeDB` version chain.
- **CI gains an always-on fast lane** (tsc, lint, unit tests) on every PR
  push. The full label-gated job is unchanged.
- **The home page and Ajustes are split** only after U11 has merged; the
  split preserves behaviour and adds no state.
- **`docs/INDEX.md` is the entrance**; superseded plans move to
  `docs/archive/` unchanged. `DECISIONS.md` stays append-only and in place.
- **Unit logs, not `DECISIONS.md` appends**, per unit; the final link pass
  (W7) writes the one consolidated entry.
- **Next 16 / eslint 10 stay blocked** until `next-auth` 5 is stable. The
  Opus runner checks once and moves on.

## 2. Autonomy protocol

`docs/BUILD-QUEUE-2026-09-06.md` §4, rules 1–10, unchanged. Gates before
any PR opens: `npx tsc --noEmit`, `npm run lint`, `npm test`,
`npm run validate:content`, `npm run build`, and the e2e specs the unit
touched. Push clean, apply `run-ci`, merge when green (auto-merge is off).

## 3. The units

Opus window first (V units), then the Sonnet window (the September
leftovers, then the W units). No V unit depends on a Sonnet unit.

| Unit | Lane | Model | Size | Depends on | Prompt |
|---|---|---|---|---|---|
| V1 | Opus | **Opus** | M | — | `prompts/opus-v1-csp-enforce.md` |
| V2 | Opus | **Opus** | M | — | `prompts/opus-v2-sharing-backend-tests.md` |
| V3 | Opus | **Opus** | M | — | `prompts/opus-v3-dexie-tests.md` |
| U3 | Sonnet | Sonnet | M | U1 (merged) | `prompts/sonnet-u3-recomendados.md` |
| U8 | Sonnet | Sonnet | S | — | `prompts/sonnet-u8-brand.md` |
| U9 | Sonnet | Sonnet | M | — | `prompts/sonnet-u9-ai-drafts.md` |
| U10 | Sonnet | Sonnet | S | U7 + founder renders | `prompts/sonnet-u10-hero-assets.md` (skip if no renders) |
| U11 | Sonnet | Sonnet | S | all U units merged | `prompts/sonnet-u11-link-pass.md` |
| W1 | Sonnet | Sonnet | S | — | `prompts/sonnet-w1-ci-fast-lane.md` |
| W2 | Sonnet | Sonnet | S | — | `prompts/sonnet-w2-docs-index.md` |
| W3 | Sonnet | Sonnet | S | — | `prompts/sonnet-w3-a11y-contrast.md` |
| W4 | Sonnet | Sonnet | M | U11 | `prompts/sonnet-w4-split-home-ajustes.md` |
| W5 | Sonnet | Sonnet | M | V2 | `prompts/sonnet-w5-server-backend-tests.md` |
| W6 | Sonnet | Sonnet | S | — | `prompts/sonnet-w6-perf-budget.md` |
| W7 | Sonnet | Sonnet | S | everything above | `prompts/sonnet-w7-link-pass.md` |

**Why Opus where it says Opus.** V1 changes a header every route is served
under and can blank the app if wrong; the verification across every route
is the work. V2 decides where the cut between rules and storage falls in
the module that answers "who may see whose pregnancy", and W5 copies that
cut four times. V3 stands up a test project and a fixture format that later
units add to. Everything else fills a shape that already exists.

## 4. Running order

```
Window 1 — OPUS:   paste  Read prompts/RUN-OPUS-2.md in this repo and execute it.
                   builds V1 → V2 → V3, merges each, stops with a report

Window 2 — SONNET: paste  Read prompts/RUN-SONNET-2.md in this repo and execute it.
                   builds U3 → U8 → U9 → (U10) → U11 → W1 → W2 → W3 → W6 → W5 → W4 → W7
```

W4 runs late because it edits the two files U11 owns, and W5 needs V2's
harness on `main`. W6 runs before W4 so the perf budget has a baseline
from before the split.

Rough cost: Opus $15–25 per unit, Sonnet $5–10 → ≈ $100–180 for both
windows. Wall-clock ≈ 3 h and ≈ 6 h.

## 5. File ownership map

| Path | Owner |
|---|---|
| `next.config.ts`, `e2e/csp.spec.ts`, `lib/invariants/csp.test.ts` | V1 |
| `lib/server/sharing.ts`, `lib/server/sharingBackend.ts` (new), `lib/server/sharing.test.ts` (new), `app/api/v1/sharing/route.ts` (wiring only) | V2 |
| `lib/server/questions.ts`, `support.ts`, `push.ts`, `photos.ts` + their `*Backend.ts` / `*.test.ts`, their routes (wiring only) | W5 |
| `vitest.config.mts`, `vitest.db.config.mts` (new), `test/db/**`, `lib/db.test.ts`, `package.json` scripts `test:db` | V3 |
| `.github/workflows/ci.yml` | V3 (one line) then W1, sequentially |
| `docs/INDEX.md`, `docs/archive/**`, `README.md` (pointer line), `tsconfig.json` `include`, `scripts/gen-guarani-review.mts` | W2 |
| `app/(app)/herramientas/fotos/page.tsx`, `.../carne/page.tsx` (alt text only), `lib/hero/themes.test.ts`, `lib/hero/contrast.ts` (new) | W3 |
| `app/(app)/page.tsx`, `app/(app)/ajustes/**`, `components/home/**` (new), `components/ajustes/**` (new) | U11 then W4, sequentially |
| `scripts/perf.mjs`, `package.json` script `perf`, `docs/PERF.md` | W6 |
| `DECISIONS.md` (one entry), `docs/BUILD-PLAN.md` statuses, `KNOWN-ISSUES.md`, this file §7 | W7 only |

Append-only exceptions carry over from the September map (`ADMIN_ACTIONS`,
admin nav, `lib/content/schemas.ts`). `package.json` may be edited by V3
and W6 for one script line each; `npm ci` after every merge of `main`.

## 6. Founder inputs

Unchanged from `docs/BUILD-QUEUE-2026-09-06.md` §8; see the report §3.
None blocks a V or W unit.

## 7. Build log index

One line per unit as it merges: `<id> — PR #… — docs/log/<id>.md`.

- V1 — PR #95 — `docs/log/v1.md`

