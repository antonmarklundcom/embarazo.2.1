# Launch-plan artifact. Paste into a fresh SONNET session on this repo.

Build one easy-to-read HTML artifact: **the Mi Bebé launch plan, ordered by
priority**, for the founder to work through. Read-only task: no code changes,
no PR. Load the `artifact-design` skill before writing the page.

## Sources — read all of them first, in this order

1. `docs/LAUNCH-CHECKLIST.md` — the running order. This is the spine.
2. `docs/HANDOFF-2026-08-21.md` §3 and §4 — the why behind each founder task.
3. `docs/ANDROID-LAUNCH.md` §1, §4, §5 — Play account, listing assets, sequence.
4. `docs/SITE-PLAN-EMBARAZO-COM-PY.md` §0, §8, §10 — the marketing-site
   decisions, build phases and human inputs.
5. `docs/IDEAS-2026-09.md` — the founder's decisions on the next app features.

Do not invent items. Every row on the page must trace to one of those files;
if two files disagree, the newer one wins and you say so in a footnote.

## What the page must contain

Group by priority, in this order, each group a clearly separated section:

- **A. Decide first (irreversible)** — Play account type, app name, Guaraní
  ship-or-gate, the five site-plan decisions.
- **B. Start now — clocks that run without you** — D-U-N-S, medical reviewer,
  Meta verification, lawyer, directory listings.
- **C. This week, hours not weeks** — support address, Guaraní sheet, IARC
  re-rating, health declaration, analytics choice, DNS.
- **D. Content that finishes slowly** — week renders, store assets, events,
  placements.
- **E. Play sequence** — the ten numbered steps, each waiting on the previous.
- **F. Build work (Claude sessions)** — site phases 1–3, the app-side PR,
  TWA packaging, the approved app ideas from `IDEAS-2026-09.md`, with the
  model lane (Opus or Sonnet) named per the plan. Never name Fable here.
- **G. Parked** — items explicitly deferred, with the reason.

Every item is one row with: what, owner (Anton / lawyer / reviewer / native
speaker / Claude build), lead time, what it blocks, and a status. Status is
"not started" unless a source says otherwise; never mark something done on a
guess. Add a one-line "do today" box at the top that repeats the checklist's
own summary: request the D-U-N-S number and call a gineco-obstetra.

## Design

Utilitarian, scannable, printable. Mi Bebé palette (cream ground, petrol
structure, terracotta as the single accent), Nunito Sans body. One accent
colour reserved for "blocks everything" rows. Tables scroll in their own
container on mobile. Both light and dark themes. Title: `Mi Bebé Launch Plan`.
Favicon 🪺. Publish with the Artifact tool and return the link.
