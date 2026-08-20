/**
 * K19-L1 — the app's core UI dictionary.
 *
 * ## Why this is 40 lines of hand-written TypeScript and not `next-intl`
 *
 * The plan (§6 K19) rules out next-intl, locale routes and middleware, and
 * each exclusion pays for something this app already committed to:
 *
 * - **No locale routes.** `/emergencia` is precached by the service worker and
 *   opened offline. `/gn/emergencia` would be a second URL to precache, a
 *   second cache entry per page, and a woman whose locale changed after her
 *   last online session would tap a link into a route she has never fetched.
 *   The locale lives on the profile row instead, so it costs zero URLs.
 * - **No middleware.** K13a made "this app has no middleware" a documented
 *   security invariant (the Next.js middleware-bypass CVE cannot apply to a
 *   codebase with no middleware). Locale detection is not worth spending it.
 * - **One chunk, both locales.** ~25 KB gzipped each, and the toggle has to
 *   work with the plane on. A lazily-fetched locale bundle is a toggle that
 *   works in the office and fails in Concepción.
 *
 * ## The type is the parity test
 *
 * `es` is the source of truth and `gn` is typed as `Record<CoreKey, string>`,
 * so a key added to `es` and forgotten in `gn` is a **type error at build
 * time**, not a `undefined` rendered into a nav label at runtime. `dict.test.ts`
 * covers what the type cannot: empty strings, and the copy-paste that leaves a
 * "translation" identical to the Spanish.
 *
 * ## What is *not* here
 *
 * The 42 weeks of content, the guías, the food entries, the derechos bodies.
 * All of it stays es-PY (D6): translating a medical corpus is institutional
 * work with a reviewer attached, and a half-translated corpus is worse than an
 * untranslated one because it looks finished. This dictionary is navigation,
 * actions and safety framing — the strings that get you *to* the content.
 */

export const LOCALES = ["es", "gn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/**
 * What `<html lang>` becomes for each locale.
 *
 * es-PY rather than es: the app formats dates and numbers with `es-PY`
 * throughout, and the region actually changes the rendering ("setiembre").
 * `gn` has no region subtag in common use.
 */
export const HTML_LANG: Record<Locale, string> = {
  es: "es-PY",
  gn: "gn",
};

/** How each locale names itself. Never translated — a language picker that
 * renders "Guaraní" in Spanish is useless to the person looking for Guaraní. */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Castellano",
  gn: "Guaraní",
};

/**
 * The Spanish source of truth. Keys are `área.qué`, so an unused key is
 * greppable and a screen's strings sit together.
 */
const es = {
  // ---- Bottom navigation (5 tabs) ----
  "nav.today": "Hoy",
  "nav.guides": "Guías",
  "nav.checklist": "Checklist",
  "nav.tools": "Herramientas",
  "nav.nearby": "Cerca tuyo",

  // ---- Header ----
  "header.settings": "Ajustes",
  "header.emergency": "SOS",

  // ---- Emergency / safety framing ----
  "emergency.title": "Emergencia",
  "emergency.callNow": "Llamar",
  "emergency.whatsapp": "WhatsApp",
  "emergency.whenYouCall": "Cuando llames, decí:",
  "emergency.yourHospital": "Tu sanatorio o guardia",
  "emergency.yourHospitalHint":
    "Guardá el número de tu sanatorio para llamar con un toque.",
  "emergency.yourContact": "Tu contacto de emergencia",
  "emergency.yourContactHint":
    "Alguien de confianza que pueda acompañarte o buscarte.",
  "emergency.readFullGuide": "Leer la guía completa",
  "emergency.disclaimer":
    "Mi Bebé es informativa y no reemplaza la atención médica. Ante la duda, consultá igual: vale más una consulta de más.",
  "emergency.noName": "Sin nombre",

  // ---- Common actions ----
  "action.save": "Guardar",
  "action.cancel": "Cancelar",
  "action.edit": "Editar",
  "action.delete": "Borrar",
  "action.back": "Volver",
  "action.continue": "Seguir",
  "action.close": "Cerrar",
  "action.saved": "Guardado.",

  // ---- Home ----
  "home.today": "Hoy",
  "home.week": "Semana",
  "home.nextControl": "Tu próximo control",
  "home.shortcuts": "Accesos rápidos",

  // ---- Settings ----
  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.languageHint":
    "Cambia los textos de navegación y las pantallas de seguridad. Las guías y el contenido semanal siguen en castellano.",
  "settings.privacy": "Tu privacidad",
  "settings.account": "Tu cuenta",
  "settings.pregnancy": "Embarazo",
  "settings.backup": "Copia de seguridad",

  // ---- Directory / nearby ----
  "directory.title": "Cerca tuyo",
  "directory.search": "Buscar",
  "directory.noResults": "No encontramos nada con ese filtro.",

  // ---- Guides ----
  "guides.title": "Guías",
  "guides.readMore": "Leer más",
  "guides.spanishOnly": "Las guías están en castellano.",

  // ---- Offline / status ----
  "status.offline": "Sin internet. Lo que ves está guardado en tu teléfono.",
  "status.loading": "Cargando…",
} as const;

/** Every key in the dictionary. A screen that needs a new string adds it here
 * first, and the compiler then demands the Guaraní. */
export type CoreKey = keyof typeof es;

/**
 * The Guaraní column. Typed as a total record, so this file does not compile
 * until every key above has a Guaraní string.
 *
 * The register is jopara — the everyday mixed Guaraní people in Asunción and
 * the interior actually speak — not academic Guaraní. Loanwords that are the
 * normal spoken form ("checklist", "WhatsApp", "internet") stay as they are;
 * translating them into coined equivalents would produce a screen that no
 * user recognises. ⚠️ Pending native-speaker review before public launch —
 * the same founder gate as the medical reviewer. See DECISIONS.md.
 */
const gn: Record<CoreKey, string> = {
  "nav.today": "Ko ára",
  "nav.guides": "Ñe'ẽkuaa",
  "nav.checklist": "Checklist",
  "nav.tools": "Mba'apoha",
  "nav.nearby": "Ne ypýpe",

  "header.settings": "Ojeguatyrõ",
  "header.emergency": "SOS",

  "emergency.title": "Emergencia",
  "emergency.callNow": "Ehenói",
  "emergency.whatsapp": "WhatsApp",
  "emergency.whenYouCall": "Rehenóivo, ere:",
  "emergency.yourHospital": "Ne sanatorio térã guardia",
  "emergency.yourHospitalHint":
    "Eñongatu ne sanatorio numero rehenói haguã peteĩ poko reheve.",
  "emergency.yourContact": "Ne contacto emergencia peguarã",
  "emergency.yourContactHint":
    "Peteĩ nde jeroviaha ikatúva ne moirũ térã ne ru.",
  "emergency.readFullGuide": "Emoñe'ẽ guía tuichakue",
  "emergency.disclaimer":
    "Mi Bebé omomarandu ha nomyengoviái pohãnohára. Reikuaa'ỹramo, eñeporandu: iporãve peteĩ consulta hetave.",
  "emergency.noName": "Téra'ỹre",

  "action.save": "Eñongatu",
  "action.cancel": "Ani",
  "action.edit": "Emoambue",
  "action.delete": "Emboguete",
  "action.back": "Eguevi",
  "action.continue": "Eku'e",
  "action.close": "Emboty",
  "action.saved": "Oñeñongatu.",

  "home.today": "Ko ára",
  "home.week": "Semana",
  "home.nextControl": "Ne control oútava",
  "home.shortcuts": "Jeike pya'e",

  "settings.title": "Ojeguatyrõ",
  "settings.language": "Ñe'ẽ",
  "settings.languageHint":
    "Omoambue navegación ha pantalla seguridad rehegua ñe'ẽ. Guía ha contenido semanal opyta castellano-pe.",
  "settings.privacy": "Ne privacidad",
  "settings.account": "Ne cuenta",
  "settings.pregnancy": "Membykue",
  "settings.backup": "Copia seguridad rehegua",

  "directory.title": "Ne ypýpe",
  "directory.search": "Eheka",
  "directory.noResults": "Ndojejuhúi mba'eve upe filtro reheve.",

  "guides.title": "Ñe'ẽkuaa",
  "guides.readMore": "Emoñe'ẽve",
  "guides.spanishOnly": "Guíakuéra oĩ castellano-pe.",

  "status.offline": "Internet'ỹre. Rehecháva oñeñongatu ne telefono-pe.",
  "status.loading": "Oñemyanyhẽhína…",
};

/** Both columns, addressed by locale. Ships in one chunk, by design. */
export const DICT: Record<Locale, Record<CoreKey, string>> = { es, gn };

/**
 * Look one string up.
 *
 * There is no interpolation and no plural machinery: every key above is a
 * whole, self-contained sentence or label. The moment a string needs a count
 * baked into it, Guaraní pluralisation is a linguist's question, not a
 * `{count, plural, …}` question — so the app composes such lines out of a
 * label plus a formatted number instead, and this function stays this small.
 */
export function translate(locale: Locale, key: CoreKey): string {
  return DICT[locale][key];
}

/** Narrow an arbitrary stored value to a supported locale. */
export function asLocale(value: unknown): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
