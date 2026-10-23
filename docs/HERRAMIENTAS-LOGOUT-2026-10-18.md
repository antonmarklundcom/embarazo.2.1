# Herramientas account footer — 18 October 2026

Owner requested a logout option at the bottom of Herramientas. The footer adds Mi cuenta and, after the shared auth-status request confirms a session, the existing Cerrar sesión button. The page remains static and contains no server-rendered identity. Existing logout ends this device's push subscription, purges private response caches, and invokes the existing account server action. It does not delete the account or cloud records.

Files: app/(app)/herramientas/page.tsx and components/ToolsAccountFooter.tsx.

Validation and release status are recorded in the canonical owner manual at C:/operation manuals/embarazo.2.1/README.md. The initial full unit suite passed 1870/1875; five unrelated tests timed out importing modules. Database tests passed 122/122, content passed 19 files, TypeScript and lint passed. Production build passed (110 pages). The four affected unit files passed 43/43 when rerun serially with a 30-second timeout after the build; a serial retry during compilation had two further timeouts. Existing Herramientas Playwright checks passed 3/3. No clean full-unit-suite pass is claimed.

Release uses the existing main-branch Hostinger integration. This local change has not been pushed, merged, or deployed. Repo AGENTS.md reserves those operations for the manager. No database, environment, DNS, schema, or storage changes are required. Recovery after release: revert the footer commit through the normal main-branch release process; no data migration is involved.

