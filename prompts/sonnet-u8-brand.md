# Unit U8 — brand constant + manifest title. SONNET session. No dependencies. Optional.

Read ONLY: this file, `docs/BUILD-QUEUE-2026-09-06.md` §2 ("App name") and §4, `docs/LAUNCH-CHECKLIST.md` §1.2,
`docs/decisions-needed.md` if it exists (the founder may have recorded the name there), `lib/share/card.ts`
(`SHARE_BRAND`), `lib/share/invite.ts`, `app/manifest.webmanifest`, `app/layout.tsx` metadata, `components/AppHeader.tsx`.
Execute under the autonomy protocol (§4).

Owns: `lib/brand.ts` + `.test.ts` · `app/manifest.webmanifest` · `app/layout.tsx` (metadata title/description only) ·
`scripts/gen-og.mjs` (title string only) · user-visible brand strings in `components/**` and `app/**` (the string
only, nothing else on the line) · `lib/share/card.ts` + `lib/share/invite.ts` (import the constant) · `docs/log/u8.md`.

Build:
- `lib/brand.ts`: `APP_NAME = "Mi Bebé"`, `APP_DESCRIPTOR = "Embarazo Paraguay"`, `APP_TITLE = "Mi Bebé · Embarazo
  Paraguay"`, `APP_SHORT_NAME = "Mi Bebé"`. If `docs/decisions-needed.md` records a different founder decision, use
  that; otherwise these defaults (BUILD-QUEUE §2).
- Manifest: `name` = `APP_TITLE`, `short_name` = `APP_SHORT_NAME`. The manifest is a static `.webmanifest`, so it
  cannot import the constant — the brand test reads the file and asserts both fields equal the constants, so they
  cannot drift. Root metadata title template and OG title use `APP_TITLE`; the header wordmark keeps `APP_NAME`.
- Sweep: every user-visible hardcoded "Mi Bebé" in `components/**` and `app/**` imports the constant. **Do NOT
  rename**: the DB name `mibebe`, localStorage keys `mibebe.*`, SW cache names, ids, slugs, seed JSON `author`
  fields (content, not UI), or anything in `docs/`. Renaming storage keys would silently reset users' preferences.
- Test: a source scan asserting no `.tsx` under `components/` or `app/` contains the literal `Mi Bebé` outside
  `lib/brand.ts` (allow-list the seed JSON and docs). Existing share/invite tests keep passing unchanged.

Exit: gates green (§4.3); `git grep "Mi Bebé" -- components app` returns nothing; the installed PWA shows the
full title on the install prompt and the short name under the icon. Open the PR that turn; write `docs/log/u8.md`.
Spawn nothing.
