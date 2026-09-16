// U8 — single source of truth for the product's brand strings.
//
// Everywhere the app used to hardcode "Mi Bebé" (or the full title with its
// descriptor), it now imports one of these instead, so a future rename is a
// one-line change here rather than a repo-wide sweep. `app/manifest.webmanifest`
// is the one place that cannot import this file — it's a static asset — so
// `lib/brand.test.ts` reads it and asserts its fields equal these constants.
//
// Confirmed by Anton 2026-09-16 (docs/decisions-needed.md): "Mi Bebé · Embarazo
// Paraguay".

/** Short product name — header wordmark, PWA short_name, most body copy. */
export const APP_NAME = "Mi Bebé";

/** The descriptor that pairs with APP_NAME wherever a title has room for it. */
export const APP_DESCRIPTOR = "Embarazo Paraguay";

/** Full title — manifest `name`, OG/Twitter title, root metadata title. */
export const APP_TITLE = `${APP_NAME} · ${APP_DESCRIPTOR}`;

/** PWA manifest `short_name` — shown under the home-screen icon. */
export const APP_SHORT_NAME = APP_NAME;
