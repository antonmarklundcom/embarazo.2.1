// U9 — AI-drafted answers inside the curated Q&A queue (K20), pure half.
//
// Same shape as `lib/ai/babyImage.ts`: the kill switch, the prompt and the
// output shape live in a module with no `process.env` read of its own, so it
// stays importable from code an admin server component renders without
// dragging a secret into anything. The env bag comes in as an argument, like
// `AiEnv` already does for F1/F2.
//
// **Nothing generated here ever reaches a user.** This module only builds a
// prompt and cleans up what comes back; `lib/server/aiDraft.ts` is the only
// caller of the model, and the admin UI treats the result as an editable
// prefill of the existing answer textarea. Publishing still goes through
// `answerQuestion` unchanged (see `app/admin/actions.ts`).

import type { AiEnv } from "./babyImage";

/**
 * The kill switch.
 *
 * Same two-variable shape as `isAiBabyEnabled`: a flag a founder can flip in a
 * hurry, and the key that makes any of this possible at all. Either missing
 * means the feature does not exist — the button is absent, not disabled.
 */
export function isAiDraftEnabled(env: AiEnv): boolean {
  const enabled = env.AI_DRAFT_ENABLED?.trim() === "true";
  const key = env.GEMINI_API_KEY?.trim();
  return enabled && !!key;
}

/** Text model. Overridable so a model change is an env edit, not a deploy. */
export function aiDraftModel(env: AiEnv): string {
  return env.AI_DRAFT_MODEL?.trim() || "gemini-2.5-flash";
}

/**
 * How many drafts may be generated across the whole panel per UTC day.
 *
 * Same fail-closed shape as `aiBabyMonthlyQuota`: unset, empty, negative or
 * nonsense all fall back to the conservative default, never to "unlimited" —
 * a typo in a Hostinger env field must not be able to mean "draft as many as
 * you like".
 */
export function aiDraftDailyCap(env: AiEnv): number {
  const raw = numberOrNull(env.AI_DRAFT_DAILY_CAP);
  return raw === null ? DEFAULT_DAILY_CAP : Math.floor(raw);
}

/** Default cap when `AI_DRAFT_DAILY_CAP` is unset or malformed. */
export const DEFAULT_DAILY_CAP = 20;

function numberOrNull(raw: string | undefined): number | null {
  const text = raw?.trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

/** Where a draft points someone with anything beyond "just curious". */
export const AI_DRAFT_MAX_WORDS = 120;

/**
 * The app's stance, pinned as a constant so a future edit cannot soften it
 * without a test noticing (`draft.test.ts` asserts on these phrases directly).
 *
 * Every rule here matches ARCHITECTURE.md's boundary between this feature and
 * a medical opinion: es-PY voseo, informational only, always point to the
 * control prenatal and `/emergencia` for anything urgent, never diagnose,
 * never name a medication dose, and short — a draft this long is not helping
 * the admin, who has to read and edit it before anyone sees it.
 */
export const AI_DRAFT_SYSTEM_PROMPT = [
  "Redactá un borrador de respuesta para el panel de moderación de preguntas " +
    "de Mi Bebé, una app de embarazo para usuarias en Paraguay.",
  "Escribí en español paraguayo, en voseo (vos podés / tenés, nunca tú).",
  "Es información general, no un diagnóstico ni una indicación médica " +
    "personalizada: nunca diagnostiques y nunca nombres una dosis de " +
    "medicamento.",
  "Si la pregunta describe una señal de alarma, remití siempre al control " +
    "prenatal y a la sección /emergencia de la app.",
  `Respondé en un máximo de ${AI_DRAFT_MAX_WORDS} palabras, en texto plano, ` +
    "sin encabezados ni markdown, y sin enlaces salvo una ruta interna de " +
    "la app como /emergencia.",
  "Este es solo un borrador: una persona del equipo lo va a revisar, editar " +
    "y recién después publicar.",
].join(" ");

/**
 * Assemble the full prompt sent to the model.
 *
 * A single user turn carrying both the standing instructions and the
 * question, the same shape `geminiModel` in `lib/server/aiBaby.ts` sends —
 * this repo's Gemini calls do not use a separate system-instruction field.
 */
export function buildDraftPrompt(question: string): string {
  return (
    `${AI_DRAFT_SYSTEM_PROMPT}\n\n` +
    `Pregunta de una usuaria:\n"""${question.trim()}"""\n\n` +
    "Borrador de respuesta:"
  );
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Clean up what the model returns before it ever reaches the admin's
 * textarea: no markdown, and no link the app cannot vouch for.
 *
 * - Markdown links pointing at an in-app route (`/algo`) keep the route
 *   visible in plain text; anything pointing off-app is stripped down to its
 *   label, and a bare external URL is dropped outright.
 * - Emphasis, headings, bullets and inline code markers are unwrapped rather
 *   than deleted, so the words survive even though the formatting does not.
 */
export function sanitiseDraftText(raw: string): string {
  let text = raw;

  // Markdown links: keep the label always; keep the URL only when it is an
  // in-app route (starts with "/"), never a bare host or scheme.
  text = text.replace(
    /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
    (_match, label: string, url: string) => `${label} (${url})`,
  );
  text = text.replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1");

  // Any remaining bare URL — the model naming a source outside the app.
  text = text.replace(/https?:\/\/\S+/gi, "");

  // Headings, bullets, emphasis, inline code: unwrap, do not delete the text.
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Collapse the whitespace the stripping above leaves behind.
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export type DraftFailure = "disabled" | "cap-reached" | "no-draft";

export type DraftResult =
  | { ok: true; draft: string }
  | { ok: false; failure: DraftFailure };

/** What the admin sees in place of the button, per reason. */
export const DRAFT_UNAVAILABLE_MESSAGE: Record<
  Exclude<DraftFailure, "no-draft">,
  string
> = {
  disabled: "Sugerencia de borrador no disponible.",
  "cap-reached":
    "Ya se generaron los borradores disponibles hoy. Podés escribir la " +
    "respuesta vos misma.",
};
