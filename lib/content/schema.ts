import { z } from "zod";
import { DEPARTMENTS } from "../departments";
import { MAX_WEEK, MIN_WEEK } from "../pregnancy";

// Content schemas (BUILD-PLAN G1).
//
// Everything the founder — or a model writing on the founder's behalf — adds
// to this app lands as JSON validated here, and `npm run validate:content`
// fails CI on anything that does not fit. That means content can be written,
// pasted and shipped without touching TypeScript, and without a code review
// catching the mistakes a schema can catch by itself.
//
// The rules below are not stylistic. Each one exists because it is a specific
// way this app has already been able to embarrass itself:
//   • placeholder text and the invented +595 981 000 0xx range (Z1)
//   • event dates computed at module load, which drift on every deploy
//   • duplicate slugs quietly shadowing an article
//   • the rickroll video id
//   • unreviewed medical content rendering as if reviewed (Z2)

const DEPARTMENT_SLUGS = DEPARTMENTS.map((d) => d.slug) as [string, ...string[]];

/** Blocked because these are the stand-ins Z1 gates on. */
const PLACEHOLDER_PATTERN = /placeholder|tbd|lorem ipsum|xxx/i;
const PLACEHOLDER_PHONE = /^\+?595981000\d{3}$/;
const PLACEHOLDER_YOUTUBE_ID = "dQw4w9WgXcQ";

// `max` is a parameter rather than a chained call because `.refine()` returns
// a ZodEffects, which has no `.max()`.
const cleanText = (label: string, max?: number) => {
  const base = z.string().trim().min(1, `${label} no puede estar vacío`);
  const bounded =
    max === undefined
      ? base
      : base.max(max, `${label} no puede pasar de ${max} caracteres`);
  return bounded.refine(
    (v) => !PLACEHOLDER_PATTERN.test(v),
    `${label} todavía tiene texto de relleno (placeholder / TBD / xxx)`,
  );
};

/** Paraguayan mobile in E.164: +595 followed by 9 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+595\d{9}$/,
    "El número tiene que estar en formato +595 seguido de 9 dígitos, sin espacios",
  )
  .refine(
    (v) => !PLACEHOLDER_PHONE.test(v),
    "Ese número es uno de los inventados de ejemplo (+595 981 000 0xx)",
  );

export const slugSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "El slug solo puede tener minúsculas, números y guiones",
  )
  .max(80);

/** ISO date, and a real one — "2026-02-31" parses but does not exist. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá el formato AAAA-MM-DD")
  .refine((v) => {
    const parts = v.split("-").map(Number);
    const [y, m, d] = parts as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
    );
  }, "Esa fecha no existe en el calendario");

export const departmentSchema = z.enum(DEPARTMENT_SLUGS, {
  errorMap: () => ({
    message: `Departamento inválido. Usá uno de: ${DEPARTMENT_SLUGS.join(", ")}`,
  }),
});

export const weekSchema = z
  .number()
  .int()
  .min(MIN_WEEK)
  .max(MAX_WEEK);

// ---------------------------------------------------------------------------
// Articles (guías)
// ---------------------------------------------------------------------------

// Kept in sync with what the existing guías use; adding a cluster here is a
// deliberate editorial decision, which is why the enum is closed rather than a
// free string. ("logistica" = practical how-to: what to pack, where to go.)
export const ARTICLE_CLUSTERS = [
  "salud",
  "logistica",
  "tramites",
  "derechos",
  "alimentacion",
  "parto",
  "postparto",
  "bienestar",
] as const;

export const articleSchema = z
  .object({
    slug: slugSchema,
    title: cleanText("El título"),
    excerpt: cleanText("El resumen", 200),
    date: isoDateSchema,
    author: cleanText("El autor"),
    /**
     * The reviewing professional's real name, or null when nobody has reviewed
     * it yet. Null is honest and allowed; a fake name is not.
     *
     * Unreviewed ARTICLES still publish — they simply carry no review byline
     * (see MedicalReviewByline). Hiding them would remove the app's whole
     * content library over a claim we already stopped making. Unreviewed
     * FOODS do not publish, because "sí, podés comer esto en el embarazo" is
     * itself a medical claim rather than general information.
     */
    reviewedBy: cleanText("El revisor").nullable(),
    cluster: z.enum(ARTICLE_CLUSTERS),
    /** Week this article is most relevant to, for the C6 weekly feed. */
    week: weekSchema.optional(),
    html: z
      .string()
      .trim()
      .min(200, "El artículo es muy corto — apuntá a 600–900 palabras")
      .refine(
        (v) => !PLACEHOLDER_PATTERN.test(v),
        "El cuerpo todavía tiene texto de relleno",
      )
      .refine(
        (v) => !/<script/i.test(v),
        "El HTML no puede contener <script>",
      ),
  })
  .strict();

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export const videoSchema = z
  .object({
    id: slugSchema,
    title: cleanText("El título"),
    description: cleanText("La descripción"),
    topic: cleanText("El tema"),
    trimester: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    week: weekSchema.optional(),
    youtubeId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{11}$/, "Un ID de YouTube tiene 11 caracteres")
      .refine(
        (v) => v !== PLACEHOLDER_YOUTUBE_ID,
        "Ese es el video de ejemplo, no uno real",
      ),
    durationLabel: z.string().trim().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

export const DIRECTORY_CATEGORY_KEYS = [
  "sanatorio",
  "obstetra",
  "ecografia",
  "cordon",
  "pediatra",
  "lactancia",
  "vacunatorio",
  "tienda_bebe",
  "farmacia",
] as const;

export const directoryListingSchema = z
  .object({
    id: slugSchema,
    name: cleanText("El nombre"),
    category: z.enum(DIRECTORY_CATEGORY_KEYS),
    department: departmentSchema,
    city: cleanText("La ciudad"),
    address: cleanText("La dirección").optional(),
    whatsappNumber: phoneSchema,
    mapsUrl: z.string().url("El enlace de Maps tiene que ser una URL").optional(),
    isSponsored: z.boolean(),
    priority: z.number().int().min(0).max(100),
    /**
     * Consent is a field, not a convention: every listing states that the
     * business agreed to appear. A listing without it does not publish.
     */
    consentedAt: isoDateSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_TYPES = [
  "charla",
  "taller",
  "feria",
  "clase",
  "encuentro",
] as const;

export const eventSchema = z
  .object({
    id: slugSchema,
    title: cleanText("El título"),
    type: z.enum(EVENT_TYPES),
    department: departmentSchema,
    city: cleanText("La ciudad"),
    venue: cleanText("El lugar").optional(),
    /**
     * A real date and time. The old seed computed dates at module load, which
     * meant every deploy silently moved every event — hence a fixed local
     * datetime string here rather than a number.
     */
    startsAt: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
        "Usá el formato AAAA-MM-DDTHH:MM (hora de Paraguay)",
      ),
    description: cleanText("La descripción"),
    organizer: cleanText("Quién organiza"),
    whatsappNumber: phoneSchema.optional(),
    mapsUrl: z.string().url().optional(),
    isSponsored: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Food lookup (D3) — "¿puedo comer…?"
// ---------------------------------------------------------------------------

export const FOOD_VERDICTS = ["si", "cuidado", "evitar"] as const;

export const foodItemSchema = z
  .object({
    id: slugSchema,
    /** What people actually call it here: "tereré", "chipa guasu", "surubí". */
    name: cleanText("El nombre"),
    /** Other names and spellings people might search for. */
    aliases: z.array(cleanText("El alias")).default([]),
    verdict: z.enum(FOOD_VERDICTS),
    /** One line. The verdict without a reason is not useful. */
    reason: cleanText("El motivo", 240),
    /** Optional practical advice: how to make it safe. */
    advice: cleanText("El consejo", 240).optional(),
    reviewedBy: cleanText("El revisor").nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Weekly one-liners (C2)
// ---------------------------------------------------------------------------

export const weekNoteSchema = z
  .object({
    week: weekSchema,
    /**
     * ONE concrete sentence about what is happening right now — the line that
     * sits under the hero. Not a paragraph: if it needs two sentences, it
     * belongs in the week page instead.
     */
    text: cleanText("La frase", 160),
    reviewedBy: cleanText("El revisor").nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** Rejects duplicate values of `key` across a collection. */
function uniqueBy<T>(key: keyof T & string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Map<unknown, number>();
    items.forEach((item, index) => {
      const value = item[key];
      const first = seen.get(value);
      if (first !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, key],
          message: `"${String(value)}" ya está usado en la entrada ${first} — cada ${key} tiene que ser único`,
        });
      } else {
        seen.set(value, index);
      }
    });
  };
}

export const articlesFileSchema = z
  .object({ articles: z.array(articleSchema).superRefine(uniqueBy("slug")) })
  .strict();

export const videosFileSchema = z
  .object({ videos: z.array(videoSchema).superRefine(uniqueBy("id")) })
  .strict();

export const directoryFileSchema = z
  .object({
    listings: z.array(directoryListingSchema).superRefine(uniqueBy("id")),
  })
  .strict();

export const eventsFileSchema = z
  .object({ events: z.array(eventSchema).superRefine(uniqueBy("id")) })
  .strict();

export const foodFileSchema = z
  .object({ foods: z.array(foodItemSchema).superRefine(uniqueBy("id")) })
  .strict();

export const weekNotesFileSchema = z
  .object({ notes: z.array(weekNoteSchema).superRefine(uniqueBy("week")) })
  .strict();

export type ArticleContent = z.infer<typeof articleSchema>;
export type VideoContent = z.infer<typeof videoSchema>;
export type DirectoryContent = z.infer<typeof directoryListingSchema>;
export type EventContent = z.infer<typeof eventSchema>;
export type FoodContent = z.infer<typeof foodItemSchema>;
export type WeekNoteContent = z.infer<typeof weekNoteSchema>;

export const CONTENT_FILES = [
  { file: "articles.json", schema: articlesFileSchema, label: "Guías" },
  { file: "videos.json", schema: videosFileSchema, label: "Videos" },
  { file: "directory.json", schema: directoryFileSchema, label: "Directorio" },
  { file: "events.json", schema: eventsFileSchema, label: "Eventos" },
  { file: "food.json", schema: foodFileSchema, label: "Alimentos" },
  { file: "week-notes.json", schema: weekNotesFileSchema, label: "Frases semanales" },
] as const;
