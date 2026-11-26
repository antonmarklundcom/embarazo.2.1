// "Hoy corto" — which of Hoy's tap-to-open rows are open.
//
// Held in memory for the life of this page load and nowhere else: no
// localStorage, no sessionStorage, no Dexie. Leaving Hoy for a tool and coming
// back with the bottom bar keeps a row she opened open (the module outlives the
// route's components); a full reload, or the app opened again from the home
// screen, starts with every row closed.
//
// A link into Hoy can also ask for one row to be open on arrival with
// `/#abrir=<id>` (`homeSectionHref`). A fragment rather than a query, because
// the service worker matches its precached `/` on the path and query: a query
// would miss it offline and land on /offline. The page reads it once and then
// drops it from the URL, as it does the site's deep-link params.

export const HOME_SECTION_IDS = [
  "tu-semana",
  "herramientas",
  "acompanada",
  "en-paraguay",
  "mas",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const OPEN_SECTION_PARAM = "abrir";

const open = new Set<HomeSectionId>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function isHomeSectionId(value: unknown): value is HomeSectionId {
  return typeof value === "string" && (HOME_SECTION_IDS as readonly string[]).includes(value);
}

export function isHomeSectionOpen(id: HomeSectionId): boolean {
  return open.has(id);
}

export function setHomeSectionOpen(id: HomeSectionId, value: boolean): void {
  if (open.has(id) === value) return;
  if (value) open.add(id);
  else open.delete(id);
  emit();
}

export function subscribeHomeSections(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests only: back to "every row closed". */
export function resetHomeSections(): void {
  open.clear();
  emit();
}

/** The link that opens Hoy with one row already open. */
export function homeSectionHref(id: HomeSectionId): string {
  return `/#${OPEN_SECTION_PARAM}=${id}`;
}

function fragmentParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

/** The row a `#abrir=` fragment asks for, or null. Unknown ids are ignored. */
export function sectionFromHash(hash: string): HomeSectionId | null {
  const value = fragmentParams(hash).get(OPEN_SECTION_PARAM);
  return isHomeSectionId(value) ? value : null;
}

/**
 * The same URL without `abrir` in its fragment, as a path for
 * `history.replaceState`, or null when there was nothing to remove. Other
 * fragment keys (the site's deep-link params) are kept.
 */
export function withoutSectionParam(href: string): string | null {
  const url = new URL(href);
  const fragment = fragmentParams(url.hash);
  if (!fragment.has(OPEN_SECTION_PARAM)) return null;
  fragment.delete(OPEN_SECTION_PARAM);
  const rest = fragment.toString();
  url.hash = rest ? `#${rest}` : "";
  return url.pathname + url.search + url.hash;
}

/**
 * Reads `#abrir=` from the current location once, opens that row and removes
 * the key from the URL. Returns the row it opened.
 */
export function consumeSectionParam(): HomeSectionId | null {
  const id = sectionFromHash(window.location.hash);
  const cleaned = withoutSectionParam(window.location.href);
  if (cleaned !== null) window.history.replaceState(window.history.state, "", cleaned);
  if (id) setHomeSectionOpen(id, true);
  return id;
}
