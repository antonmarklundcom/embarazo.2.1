# Redesign plan — "Mi Bebé" visual language (July 2026)

> Source of truth: the design canvas the founder approved
> (`Mi_Bebé_App.dc.html`, screens 1a–1d). This plan maps that design onto
> the existing app WITHOUT dropping shipped features and WITHOUT breaking
> the privacy contract (ARCHITECTURE.md §4). Work it top-to-bottom; every
> task passes `npx tsc --noEmit && npm test && npm run build`.

## 1. Design tokens (screen 1d)

| Token | New value | Replaces |
|---|---|---|
| Acento (accent) | `#C96342` terracotta | `#D9714B` |
| Marca (brand) | `#2F5D50` green | petrol `#1F5F5B` |
| Tinta (ink) | `#322E29` | `#2A2724` |
| Fondo (bg) | `#FBF7F1` cream | unchanged |
| Borde | `#EDE5DA` (`line`) | `black/5` |
| Secundario | `#7A7369` (`muted`) | `#7E766C` |
| Pastels | rosa `#F3DAD4` · celeste `#D9E5EC` · salvia `#DFE8D8` · lavanda `#E6E0F0` · arena `#F8E2CB` (text `#8A5A2E`) | new |

Typography (Nunito Sans, already loaded — add weights 600–900):
24/900 screen titles · 20/900 section titles · 15/800 card titles ·
15/600 body (lh 1.5) · 11/800 +1.6px letter-spacing overlines in brand
green · 12/600 muted secondary. Cards: radius 16px, border `#EDE5DA` on
white or solid pastel. Icons: 1.5–1.7 stroke, round caps, ink. Chips/
buttons: pill radius; primary = terracotta bg + white text.

Implementation: values updated **in place** under the existing Tailwind
token names (`petrol`, `terracotta`, `ink`, `muted`) so all 37 files
retheme at once; pastels + `line` added as new tokens. `rose`/`sage`
keep mid-tone values (they're used as text) until per-screen passes
replace them.

## 2. Screen mapping (design → existing routes)

| Design | Route | Status |
|---|---|---|
| 1a Hoy | `/` (InicioPage) | Phase A: week strip, hero card, tip, mood check-in, herramientas grid, "para leer hoy" rail. Existing PY-specific cards (derechos, recursos locales, dengue, roadmap) stay below — they're the moat, the design simply didn't show them. |
| 1b Consejos | `/guias` | Phase B: category tiles, "lo más leído" / "semana N" / nutrición rails from existing seed articles. |
| 1c Comunidad | — | **NOT buildable as-is**: requires a server, accounts and moderation, which contradicts the no-server privacy contract and is a large liability (medical misinformation, anonymity). Decision needed from founder; until then the tab is NOT added. |
| Tab bar (4 tabs) | current 5 tabs | Phase A restyles the existing 5 tabs (terracotta active state). Collapsing to 4 (Hoy/Consejos/Comunidad/Herramientas) would orphan Directorio + Eventos — IA decision deferred to founder. |
| 1d Style guide | `docs/` + tokens | This file + `tailwind.config.ts`. |

## 3. Phases

- **A (done — PR #7, merged)**: tokens, font weights, AppHeader, BottomNav,
  Hoy screen.
- **B (done)**: Consejos (`/guias`) styled with pastel article cards +
  brand-green overlines; `/semana/[n]` photo hero (shared `WeekHeroImage`);
  visible name changed to "Mi Bebé" (internal storage stays `nido`).
- **B.1 (done)**: image pipeline shipped — `scripts/optimize-images.mjs`
  (`npm run optimize:images`), `public/assets/{semanas,articulos,hero}`
  folders + `public/assets/README.md`. Founder adds files, code already
  renders them.
- **C (done)**: typography sweep across all remaining screens
  (herramientas, ajustes, progreso, derechos, emergencia, directorio,
  eventos, planeando, onboarding, error/404 pages): 900 screen titles in
  ink, extrabold card titles, +1.6px brand-green overlines, `border-line`.
- **D (todo, founder)**: generate/add the 42 weekly renders + article art.

## 4. Image pipeline (the "100 images" question)

Chat uploads don't scale and don't even reach the repo reliably — images
pasted into a Claude chat arrive as *visual context*, not files. The
pipeline instead:

1. **Convention**: `public/assets/semanas/bebe-<week>.webp` (42 files,
   the "Tu bebé a las N semanas" renders), `public/assets/articulos/
   <slug>.webp` for article art, `public/assets/hero/*.webp` for the
   few lifestyle photos. Components already render a styled fallback
   (arena gradient + week number) when a file is missing, so images can
   land incrementally.
2. **Getting files into the repo** (founder options, any mix):
   - GitHub web UI: open the repo → `Add file → Upload files` directly
     into `public/assets/...` on a branch (fine for ≤20 files at a time).
   - Local git: drop files in the folder, `git add public/assets && git
     commit && git push` (right answer for 100+).
   - A Claude Code session with image-generation MCP (Higgsfield is
     already connected): batch-generate the 42 weekly renders from one
     prompt template for visual consistency, commit them in-session.
     Cheapest way to get a consistent 42-image set; founder reviews
     before merge.
3. **Optimization gate**: `scripts/optimize-images.mjs` (sharp): resize
   to max 800px, encode WebP q≈78, target ≤60 KB each; run in CI so an
   unoptimized 4 MB PNG can't ship. 42 × 60 KB ≈ 2.5 MB total — fine for
   the repo, but **do not precache** them all in the SW: precache only
   the current ±1 week, lazy-load the rest (3G budget).
4. Licensing: AI-generated or founder-owned only. No scraped stock.

## 5. Decisions — all three answered (July 2026)

1. **Comunidad: not built as a public forum.** The social need is met
   instead by **family sharing with roles** (BUILD-PLAN E1) — the partner
   and close family join *your* pregnancy, rather than a moderated public
   space. This keeps the medical-misinformation and moderation liability
   out of the product while still making it social.
2. **Tab IA: resolved to 5 tabs** — Hoy · Guías · Checklist · Herramientas
   · Cerca tuyo, with Eventos and Beneficios living inside Cerca tuyo
   (BUILD-PLAN D4).
3. **Product name confirmed: "Mi Bebé."** The rename (R1) is done.

## 6. Note on the Preggers benchmark

`docs/FEATURE-MAP.md` adds 31 benchmarked features from the Swedish app
Preggers. **None of its visual language is adopted** — the pastel/cream
system in §1 above remains the design source of truth. The benchmark
contributes layout, information architecture and feature ideas only.
