# Weekly overview and size-comparison feasibility

Local work, 18 October 2026. Based on main b29e2bb plus the approved, unshipped Herramientas logout commit 438a79c.

## Implemented

Hoy now puts Esta semana, para cada uno immediately after the baby/size summary, where the standalone Detalles de la semana button was. The overview text is readable inline. The detail route remains linked inside the card. The lower duplicate is disabled only on Hoy; other WeekContentRail callers keep their existing overview.

The three perspective tabs use two rows on phones and three columns on larger screens, with 44px tap targets, a 16px gap before the content divider and no horizontal scroll container. Role-default tab and keyboard arrows remain. Browsing starts on the profile's current week, supports previous/next buttons and horizontal swipes on the text, and has Volver a mi semana. Vertical scrolling does not change weeks. Week selection is ephemeral: it never changes pregnancy dates, stored week, hero, account data or clinical content. Reload/profile-week change returns to current. Range 1–42. Existing advice is written in week ranges; adjacent weeks may share copy.

## Verification

TypeScript/lint PASS; full unit 1875/1875 with maxWorkers=2 and 30s timeout; DB 122/122; content 19. Production build PASS (110 pages), including final pinch-zoom adjustment. Browser run 16/17 initially passed; the new test fixture lacked a required Touch identifier/target. After fixing the fixture only, perspective tests passed 3/3 twice, covering all 17 distinct scenarios across runs. Screenshot visually reviewed at 390px, with fit checked at 320px. Mobile preview: E:/ai work/Artifacts/embarazo.2.1/2026-10-18/weekly-overview/mobile.png. Final TypeScript and changed-file ESLint PASS.

## Hand / forearm proposal — not implemented or generated

The current home artwork fills the same 252px frame each week (WeekHero FloatingBaby uses object-cover); that frame does not encode centimetres. Numeric measurements and illustrative art must be distinguished.

Use one real reusable hand/forearm reference asset plus a separate baby layer. Code determines relative scale from calibrated anatomical anchors; do not generate a different supposedly identical hand per week. A measured wrist-crease-to-middle-fingertip length can personalize the comparison. It does not make the phone image physically life-size without screen calibration. A beside-the-hand reference is simpler than convincing palm/forearm support with finger occlusion. A shared 3D model is more controllable for a consistent tiger-hold pose. Prototype a few stages and review developmental anatomy before extending a full series; scaling stylized current art alone cannot correct development.

The numeric dataset changes measuring method at week 20: week 19 is 15.3 cm head-to-bottom; week 20 is 25.6 cm head-to-heel. This must not create a false sudden growth jump in the visual. Sources: https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-19/ and https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-20/ .

Ultrasound data should be recorded with date, unit and measurement type. Later measurements such as head/abdomen circumference, femur length and estimated weight do not give exact whole-body length or appearance; do not present inferred imagery as an exact scan match. ISUOG biometry guideline: https://obgyn.onlinelibrary.wiley.com/doi/full/10.1002/uog.20272 . Current ultrasound onboarding stores due-date dating, not these measurements. Adding personal scan measurements requires a separate storage/privacy design; no such data model change in this patch.

## Release / recovery

Local branch codex/weekly-overview-20261018. Not pushed/merged/deployed. Repo AGENTS.md reserves push/PR/merge for the manager; earlier release-override question remains unanswered. Existing Hostinger main integration deploys after an authorized merge; do not duplicate deploy. Rollback through a revert of the layout commit. No migration, env or DNS changes required. Canonical checkout E:/ai work/Projects/embarazo.2.1/worktrees/claude-embarazo.2.1; owner manual C:/operation manuals/embarazo.2.1/README.md.
