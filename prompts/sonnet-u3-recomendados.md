# Unit U3 — "Recomendados" rail (replaces E4). SONNET session. Depends on U1 (merged).

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §1(3), §2–§4, §7, `docs/HANDOFF-2026-09-06.md` §2 (E4 →
Recomendados), BUILD-PLAN.md G1 + Z1 + D5 + E4, `docs/log/u1.md`, `lib/content/schemas.ts`, `lib/seed/gate.ts`,
`lib/seed/events.ts` (a seed module to copy), `app/api/v1/go/[id]/route.ts`, `app/admin/patrocinios/page.tsx`
(how ids are named), `components/WhatsAppButton.tsx`. Execute under the autonomy protocol (§4).

Owns: `lib/seed/recomendados.json` + `.ts` + `.test.ts` · `lib/content/schemas.ts` (append one schema block) ·
`components/RecomendadosRail.tsx` · `components/RecomendadoCard.tsx` · `app/(app)/recomendados/**` ·
`scripts/validate-content.mts` (register the new collection) · `app/api/v1/go/[id]/route.ts` (it resolves an id against placements + directory and 404s otherwise — add the
published recomendados to that lookup) · `app/admin/patrocinios/page.tsx` (name resolution, kind "recomendado") ·
`e2e/recomendados.spec.ts` · `docs/log/u3.md`. **Do not touch `app/(app)/page.tsx`** — U11 mounts the rail.

Build:
- `RecommendationSchema`: `id`, `kind: "recurso" | "producto"`, `title`, `body`, `ctaLabel`, exactly one of
  `whatsappNumber` (+595 schema) or `url`, optional `imageSrc`, optional `priceGs` (int, productos only), `stage`
  (0 = all, 1–3 trimester), `priority`, `isSponsored` (default false — sponsor deals reuse this later, no rework).
- Seed **curated free resources only** (8–12): carné perinatal (MSPBS), PAI vaccine calendar, IPS turnos, Ley
  7383/2024 prenatal-hours rights (link to `/derechos`), lactancia support groups, national emergency numbers
  (link to `/emergencia`). **Every URL and number must be one you verified in the session**; anything you cannot
  verify carries the word "placeholder" in a field so `publishedOnly()` hides it. No invented products.
- Rail + card reuse the directory card language (pastel tokens) and the existing WhatsApp CTA; external links and
  WhatsApp taps go through `/api/v1/go/[id]` so `/admin/patrocinios` counts them (kind "recomendado").
- Whole surface gated by `useFlag("recomendados")` (default off) **and** the `publishedOnly` gate; the `/recomendados`
  page renders the honest empty state when either is off. Precache `/recomendados` and list it in the sitemap
  unconditionally (the flag is runtime, the build is static); offline it renders the empty state.
- Tests: schema + gate (`recomendados.test.ts`), a test that every seeded `url` is https and every number is +595,
  e2e: flag off → nothing renders; flag on (mock `/api/v1/flags`) → cards render and a CTA hits `/api/v1/go/`.

Exit: gates green (§4.3); `npm run validate:content` covers the collection; with the flag on, the rail shows only
verified resources; with it off, no trace. Open the PR that turn; write `docs/log/u3.md`. Spawn nothing.
