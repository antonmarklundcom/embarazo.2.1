// BUILD-PLAN F1 — the AI baby image, pure half.
//
// Three constraints from ARCHITECTURE.md §10 are load-bearing and are encoded
// here rather than left to the route to remember:
//
//   1. The whole feature dies with one env var. `isAiBabyEnabled` is the only
//      thing anything asks, and it fails closed.
//   2. Parent photos are sent to the model and NOT retained. Nothing in this
//      module writes, and the request type has no field that would survive a
//      response.
//   3. The result is labelled entertainment everywhere it appears. The label
//      is a constant here so it cannot be reworded into something that reads
//      like a prediction.

export type AiEnv = { readonly [key: string]: string | undefined };

/**
 * The kill switch.
 *
 * Two variables, both required, because they fail differently: the flag is how
 * the founder turns the feature off in a hurry (I4 will make it a toggle), and
 * the key is what makes it work at all. Either one missing means the feature
 * does not exist — the route 404s and the tool is not linked.
 */
export function isAiBabyEnabled(env: AiEnv): boolean {
  const enabled = env.AI_BABY_ENABLED?.trim() === "true";
  const key = env.GEMINI_API_KEY?.trim();
  return enabled && !!key;
}

/** Default model. Overridable so a price change is an env edit, not a deploy. */
export function aiBabyModel(env: AiEnv): string {
  return env.AI_BABY_MODEL?.trim() || "gemini-2.5-flash-image";
}

/**
 * Cost in USD micros, for `aiGenerations.costUsdMicros`.
 *
 * BUILD-PLAN Phase F puts the ≤1024px tier at ≈$0.04. Configurable because
 * that figure moves and the plan says to verify it before launch.
 */
export function aiBabyCostMicros(env: AiEnv): number {
  const raw = Number(env.AI_BABY_COST_MICROS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 40_000;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Per-photo cap. Two 3 MB photos is already a slow upload on mobile data. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ParentPhoto {
  mimeType: string;
  /** Base64, no data-URL prefix. */
  data: string;
}

export type PhotoProblem =
  | "too-big"
  | "wrong-type"
  | "empty"
  | "wrong-count";

/**
 * Validate the photos before anything is sent anywhere.
 *
 * Returns a problem rather than throwing so the route can answer in Spanish
 * and the caller never sees a stack trace about someone's photo.
 */
export function validatePhotos(photos: ParentPhoto[]): PhotoProblem | null {
  if (photos.length < 1 || photos.length > 2) return "wrong-count";
  for (const photo of photos) {
    if (!photo.data) return "empty";
    if (!(ACCEPTED_MIME as readonly string[]).includes(photo.mimeType)) {
      return "wrong-type";
    }
    // base64 is 4/3 of the byte length.
    if ((photo.data.length * 3) / 4 > MAX_PHOTO_BYTES) return "too-big";
  }
  return null;
}

export const PHOTO_PROBLEM_MESSAGE: Record<PhotoProblem, string> = {
  "wrong-count": "Subí una o dos fotos.",
  "wrong-type": "El archivo tiene que ser una foto (JPG, PNG o WEBP).",
  "too-big": "La foto es muy pesada. Probá con una más chica.",
  empty: "No pudimos leer esa foto. Probá de nuevo.",
};

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

/**
 * The prompt carries no personal data — not a name, not a week, not a due
 * date. It describes the picture we want, and the photos are the only input
 * that identifies anybody.
 *
 * It is a constant rather than a template for the same reason the label is:
 * a template invites someone to interpolate the baby's nickname into it, and
 * then the prompt is personal data being sent to a third party.
 */
export const AI_BABY_PROMPT =
  "Create a warm, softly lit studio portrait of a healthy newborn baby, " +
  "gently blending the facial features of the people in the provided " +
  "photographs. Neutral pastel background, natural skin tones, eyes closed " +
  "or softly open, wrapped in a plain cream blanket. Photographic style, no " +
  "text, no watermark, single baby only.";

/**
 * The disclosure shown wherever a generated image appears.
 *
 * Google Play's Generative AI policy requires in-app disclosure that content
 * is AI-generated, and ARCHITECTURE.md §10 requires it be labelled
 * entertainment and never a prediction.
 */
export const AI_BABY_LABEL =
  "Imagen generada por inteligencia artificial. Es un juego, no una " +
  "predicción: no dice cómo va a ser tu bebé.";

/** What the consent step must say, kept next to the code that relies on it. */
export const AI_BABY_CONSENT_POINTS = [
  "Las fotos que subas se envían al servicio de Google que genera la imagen.",
  "No guardamos las fotos: se usan para generar y se descartan en el momento.",
  "La imagen generada queda solo en tu teléfono, y solo si la guardás vos.",
  "Es entretenimiento. No tiene nada que ver con tu salud ni con la del bebé.",
] as const;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export interface GeneratedImage {
  mimeType: string;
  /** Base64. Returned to the device; never written to our storage. */
  data: string;
}

export type GenerationFailure =
  | "disabled"
  | "invalid"
  | "upstream"
  | "no-image";

export type GenerationResult =
  | { ok: true; image: GeneratedImage }
  | { ok: false; failure: GenerationFailure };

export const FAILURE_MESSAGE: Record<GenerationFailure, string> = {
  disabled: "Esta función no está disponible ahora mismo.",
  invalid: "No pudimos usar esas fotos. Probá con otras.",
  upstream: "No pudimos generar la imagen. Probá de nuevo en un rato.",
  "no-image": "El servicio no devolvió una imagen. Probá de nuevo.",
};
