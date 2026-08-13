import { z } from "zod";
import { DEPARTMENTS } from "../departments.ts";

// G1 content ops (BUILD-PLAN.md): the zod schemas below are the single source
// of truth for every hand-authored JSON content file under lib/seed/*.json.
// A file that fails one of these checks must fail loudly and readably — a
// non-developer (founder, Gemini-assisted content edit) has to be able to
// find the file and the entry from the message alone. See
// scripts/validate-content.mts for the CLI that runs these against every file
// and `lib/seed/*.ts` for the loaders that run them again at import time.

const DEPARTMENT_SLUGS = new Set(DEPARTMENTS.map((d) => d.slug));

/** Slugs: lowercase, hyphen-separated, no leading/trailing/double hyphens. */
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "debe ser un slug en minúsculas, con guiones (ej: 'terere-mate-cocido')",
  );

/**
 * Content ids (`dir-san-001`, `vid-alimentacion`, `food-terere`…): same shape
 * as a slug, plus a check that it isn't a sloppy placeholder token someone
 * left while drafting (`todo`, `xxx`, `changeme`, `sample`, `test-1`…).
 */
const PLACEHOLDER_ID_RE = /(^|-)(todo|xxx+|changeme|sample|tbd|foo|bar|test)(-|$|\d)/i;
export const idSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    "debe ser un id en minúsculas, con guiones (ej: 'dir-san-001')",
  )
  .refine(
    (id) => !PLACEHOLDER_ID_RE.test(id),
    "el id parece de relleno (todo/xxx/changeme/sample/test) — poné un id real y estable",
  );

/** Paraguayan phone numbers as `+595` followed by 9 digits, no formatting. */
export const paraguayPhoneSchema = z
  .string()
  .regex(
    /^\+595\d{9}$/,
    "el teléfono debe tener el formato +595 seguido de 9 dígitos, sin espacios ni guiones (ej: +595981234567)",
  );

export const paraguayPhoneOptionalSchema = paraguayPhoneSchema.optional();

/** A department slug that exists in lib/departments.ts. */
export const departmentSlugSchema = z
  .string()
  .refine(
    (slug) => DEPARTMENT_SLUGS.has(slug),
    (slug) => ({
      message: `departamento desconocido: "${slug}" — tiene que ser uno de los 18 departamentos de lib/departments.ts`,
    }),
  );

/** `YYYY-MM-DD`, and must round-trip through Date (catches 2026-02-30 etc). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "la fecha debe tener el formato YYYY-MM-DD")
  .refine((value) => {
    const parts = value.split("-").map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const d = parts[2] ?? 0;
    const parsed = new Date(Date.UTC(y, m - 1, d));
    return (
      parsed.getUTCFullYear() === y &&
      parsed.getUTCMonth() === m - 1 &&
      parsed.getUTCDate() === d
    );
  }, "la fecha no existe en el calendario (revisá día/mes)");

/**
 * A fixed epoch-millisecond timestamp, sanity-bounded to roughly "the life of
 * this app" (2024–2035). This is what a hand-authored JSON file can carry —
 * unlike a `Date.now() + n * DAY` expression in a `.ts` seed file, a JSON
 * number can't be "computed at module load", but a stray value (0, a
 * date-string mistakenly left, a year in the far past/future) still is a
 * mistake worth failing loudly on.
 */
export const fixedTimestampSchema = z
  .number()
  .int()
  .refine(
    (ms) => ms > Date.UTC(2024, 0, 1) && ms < Date.UTC(2035, 0, 1),
    "el timestamp (ms desde epoch) está fuera de rango 2024–2035 — usá un valor fijo, no Date.now()",
  );

export const ArticleSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  excerpt: z.string().min(1),
  html: z.string().min(1),
  date: isoDateSchema,
  author: z.string().min(1),
  reviewedBy: z.string().min(1).optional(),
  cluster: z.string().min(1).optional(),
  // C6 — the weeks this guía is for (feature map #15). Both optional and both
  // required together: an article with no range is *always* relevant (señales
  // de alarma, dengue) and shows up as a fallback, which is a different thing
  // from an article whose range someone half-filled in.
  fromWeek: z.number().int().min(1).max(42).optional(),
  toWeek: z.number().int().min(1).max(42).optional(),
})
  .refine(
    (article) =>
      (article.fromWeek === undefined) === (article.toWeek === undefined),
    "poné fromWeek y toWeek juntos, o ninguno de los dos (sin rango = la guía sirve para todo el embarazo)",
  )
  .refine(
    (article) =>
      article.fromWeek === undefined ||
      article.toWeek === undefined ||
      article.fromWeek <= article.toWeek,
    "el rango de semanas está al revés: fromWeek tiene que ser menor o igual que toWeek",
  );
export type Article = z.infer<typeof ArticleSchema>;

/**
 * C2 — the weekly one-liner (feature map #11): one concrete "what is happening
 * now" sentence per week, shown under the home hero.
 *
 * The length cap is a content rule with teeth: the block is one line on a
 * 360 px phone, and a paragraph pasted in here would push the rest of the home
 * screen down instead of failing. `milestone` in `lib/weeks.ts` is where the
 * longer version belongs.
 */
export const WeeklyLineSchema = z.object({
  week: z
    .number()
    .int()
    .min(1, "la semana tiene que estar entre 1 y 42")
    .max(42, "la semana tiene que estar entre 1 y 42"),
  line: z
    .string()
    .min(1)
    .max(
      110,
      "la frase de la semana tiene que entrar en una línea (máximo 110 caracteres) — si necesitás más, va en el 'milestone' de lib/weeks.ts",
    ),
});
export type WeeklyLine = z.infer<typeof WeeklyLineSchema>;

/**
 * C3 — foot and hand measurements per week (feature map #12), the two tabs
 * beside "tamaño". Optional per side: a week may have a foot figure and no
 * hand one, and the tab for the missing side simply does not appear.
 *
 * The upper bounds are sanity rails, not medicine: a newborn foot is ~8 cm, so
 * a `18` typed instead of `1.8` is a CI failure rather than a card claiming
 * the baby has a foot the size of a forearm.
 */
const limbCmSchema = z
  .number()
  .positive()
  .max(12, "medida en cm fuera de rango para un pie o una mano — ¿faltó la coma decimal?");

export const LimbSizeSchema = z
  .object({
    week: z.number().int().min(1).max(42),
    footCm: limbCmSchema.optional(),
    footComparison: z.string().min(1).max(60).optional(),
    handCm: limbCmSchema.optional(),
    handComparison: z.string().min(1).max(60).optional(),
  })
  .refine(
    (entry) => entry.footCm !== undefined || entry.handCm !== undefined,
    "una entrada sin pie ni mano no sirve para nada — borrala en vez de dejarla vacía",
  );
export type LimbSize = z.infer<typeof LimbSizeSchema>;

/**
 * C4 — the perspective switcher (feature map #13): the same week explained
 * three ways.
 *
 * Entries are **week ranges**, not weeks, and the narrowest range containing a
 * week wins. That is what lets this ship as seven bands of real writing today
 * and be deepened one week at a time later — adding `{fromWeek: 24, toWeek: 24}`
 * overrides the band for that week with no code change. A per-week file of 126
 * strings written in one sitting would be filler, and filler is worse here than
 * a paragraph that holds for six weeks.
 */
export const PerspectiveBandSchema = z
  .object({
    fromWeek: z.number().int().min(1).max(42),
    toWeek: z.number().int().min(1).max(42),
    vos: z.string().min(1).max(400),
    pareja: z.string().min(1).max(400),
    familia: z.string().min(1).max(400),
  })
  .refine(
    (band) => band.fromWeek <= band.toWeek,
    "el rango está al revés: fromWeek tiene que ser menor o igual que toWeek",
  );
export type PerspectiveBand = z.infer<typeof PerspectiveBandSchema>;

/**
 * C5 — the "de la obstetra" card (feature map #14): one bylined note per week.
 *
 * The byline is `NEXT_PUBLIC_MEDICAL_REVIEWER`, so **every string here is a
 * draft awaiting a real reviewer's signature** and the card does not render at
 * all until one is configured (Z2's rule: never claim a medical review that has
 * not happened). The cap keeps a note to something a person reads standing up
 * with a phone in one hand.
 */
export const ObstetraNoteSchema = z.object({
  week: z.number().int().min(1).max(42),
  note: z.string().min(1).max(320),
});
export type ObstetraNote = z.infer<typeof ObstetraNoteSchema>;

export const VideoItemSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  topic: z.string().min(1),
  trimester: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  week: z.number().int().positive().optional(),
  youtubeId: z.string().min(1),
  durationLabel: z.string().min(1).optional(),
});
export type VideoItem = z.infer<typeof VideoItemSchema>;

export const EventItemSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  type: z.enum(["charla", "taller", "feria", "clase", "encuentro"]),
  department: departmentSlugSchema,
  city: z.string().min(1),
  venue: z.string().min(1).optional(),
  date: fixedTimestampSchema,
  description: z.string().min(1),
  organizer: z.string().min(1),
  whatsappNumber: paraguayPhoneOptionalSchema,
  mapsUrl: z.string().url().optional(),
  isSponsored: z.boolean(),
});
export type EventItem = z.infer<typeof EventItemSchema>;

export const DirectoryCategorySchema = z.enum([
  "sanatorio",
  "obstetra",
  "ecografia",
  "cordon",
  "pediatra",
  "lactancia",
  "vacunatorio",
  "tienda_bebe",
  "farmacia",
]);

export const DirectoryListingSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  category: DirectoryCategorySchema,
  department: departmentSlugSchema,
  city: z.string().min(1),
  address: z.string().min(1).optional(),
  whatsappNumber: paraguayPhoneSchema,
  mapsUrl: z.string().url().optional(),
  isSponsored: z.boolean(),
  priority: z.number().int(),
});
export type DirectoryListing = z.infer<typeof DirectoryListingSchema>;

export const AdPlacementSchema = z.object({
  id: idSchema,
  sponsorName: z.string().min(1),
  type: z.enum(["sanatorio", "ecografia", "cordon", "nutricion"]),
  trimester: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  headline: z.string().min(1),
  body: z.string().min(1),
  offerTag: z.string().min(1).optional(),
  whatsappNumber: paraguayPhoneSchema,
  ctaLabel: z.string().min(1),
  priority: z.number().int(),
});
export type AdPlacement = z.infer<typeof AdPlacementSchema>;

// D3 — "¿Puedo comer...?" food lookup.
export const FoodVerdictSchema = z.enum(["safe", "precaucion", "evitar"]);
export type FoodVerdict = z.infer<typeof FoodVerdictSchema>;

export const FoodEntrySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  synonyms: z.array(z.string().min(1)).optional(),
  verdict: FoodVerdictSchema,
  reason: z.string().min(1),
  detail: z.string().min(1).optional(),
  source: z.string().min(1),
  // Unset = not yet reviewed by the medical reviewer. Gated by
  // lib/seed/gate.ts's reviewedOnly() — must never render unset.
  reviewedBy: z.string().min(1).optional(),
});
export type FoodEntry = z.infer<typeof FoodEntrySchema>;

/**
 * Formats a zod error into one readable line per issue, naming the file, the
 * entry (by index and id when available) and the field.
 */
export function formatContentIssues(
  fileLabel: string,
  entryIndex: number,
  entryId: string | undefined,
  error: z.ZodError,
): string[] {
  const who = entryId ? `entrada #${entryIndex} (id: ${entryId})` : `entrada #${entryIndex}`;
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : "(raíz)";
    return `${fileLabel} — ${who} — campo "${field}": ${issue.message}`;
  });
}

/**
 * Validates an array of raw entries against a schema, collecting every
 * failure across every entry (rather than stopping at the first) plus a
 * duplicate-key check (id, or `slug` for articles), so one CI run surfaces
 * the whole punch list instead of one file at a time.
 */
export function validateContentArray<T>(
  fileLabel: string,
  raw: unknown[],
  schema: z.ZodType<T>,
  getKey: (entry: T) => string | undefined = (entry) =>
    (entry as { id?: string }).id,
): { valid: T[]; errors: string[] } {
  const errors: string[] = [];
  const valid: T[] = [];
  const seenKeys = new Map<string, number>();

  raw.forEach((entry, index) => {
    const result = schema.safeParse(entry);
    const rawId =
      entry && typeof entry === "object" && "id" in entry
        ? String((entry as { id: unknown }).id)
        : undefined;
    if (!result.success) {
      errors.push(...formatContentIssues(fileLabel, index, rawId, result.error));
      return;
    }
    const key = getKey(result.data);
    if (key) {
      const firstSeenAt = seenKeys.get(key);
      if (firstSeenAt !== undefined) {
        errors.push(
          `${fileLabel} — entrada #${index} (id: ${rawId ?? key}): "${key}" duplicado, ya usado en la entrada #${firstSeenAt}`,
        );
        return;
      }
      seenKeys.set(key, index);
    }
    valid.push(result.data);
  });

  return { valid, errors };
}
