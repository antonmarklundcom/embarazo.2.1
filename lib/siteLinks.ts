// Links to the public SEO site (embarazo.com.py, repo antonmarklundcom/embarazo).
//
// The site owns organic search: its week pages and cluster articles are the
// indexable versions, and the app's `/semana/[n]` and `/guias/[slug]` point
// their canonical at them so the two origins never compete for the same query.
// The app pages stay fully usable (and precached offline) — only Google's
// choice of which URL to show changes.

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_SITE_URL = "https://embarazo.com.py";

/** Site origin without a trailing slash. */
export function siteUrl(env: Env = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

// App guide slug → site article path. Mirrors the table in the site repo's
// `docs/app-facts.md`; a guide missing here simply keeps its own canonical.
export const GUIDE_TO_SITE_PATH: Readonly<Record<string, string>> = {
  "dengue-zika-chikungunya-embarazo": "/salud/dengue-en-el-embarazo/",
  "terere-mate-cocido-cafeina-embarazo": "/alimentacion/terere-en-el-embarazo/",
  "que-llevar-al-sanatorio": "/parto/que-llevar-al-sanatorio/",
  "despues-del-nacimiento-tramites": "/tramites/despues-del-nacimiento/",
  "control-prenatal-ips-vs-privado": "/tramites/control-prenatal-ips-vs-privado/",
  "senales-de-alarma-embarazo": "/salud/senales-de-alarma/",
  "vacunas-en-el-embarazo-pai": "/salud/vacunas-en-el-embarazo/",
  "derechos-embarazada-que-trabaja": "/derechos/derechos-de-la-embarazada-que-trabaja/",
};

/** Canonical site URL for an app week page (the site uses trailing slashes). */
export function siteWeekUrl(week: number, env: Env = process.env): string {
  return `${siteUrl(env)}/semana/${week}/`;
}

/** Canonical site URL for an app guide, or null when the site has no twin. */
export function siteGuideUrl(slug: string, env: Env = process.env): string | null {
  const path = GUIDE_TO_SITE_PATH[slug];
  return path ? `${siteUrl(env)}${path}` : null;
}
