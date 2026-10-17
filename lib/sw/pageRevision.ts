// Revision for the page routes the service worker precaches by URL.
//
// Serwist treats a precache entry without a revision as "this URL never
// changes": once "/" is in the cache, every later service worker keeps serving
// the HTML from the FIRST install. That HTML names JavaScript chunks which the
// next deploy deletes, so the page never hydrates and the account gate's
// server-rendered "Abriendo tu embarazo…" stays on screen (owner report,
// 17 Oct 2026). Pages therefore carry a revision derived from the build's own
// precache manifest, which includes `/_next/static/<buildId>/…` and every
// chunk hash, so it changes with every build and the pages are fetched again.

export type ManifestEntry = string | { url: string; revision?: string | null };

/** FNV-1a over every entry's URL and revision, as a short base-36 string. */
export function pageRevision(entries: readonly ManifestEntry[]): string {
  let hash = 0x811c9dc5;
  for (const entry of entries) {
    const text = typeof entry === "string" ? entry : `${entry.url}#${entry.revision ?? ""}`;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0x0a;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Page routes as revisioned precache entries. */
export function revisionedPages(routes: readonly string[], entries: readonly ManifestEntry[]): { url: string; revision: string }[] {
  const revision = pageRevision(entries);
  return routes.map((url) => ({ url, revision }));
}
