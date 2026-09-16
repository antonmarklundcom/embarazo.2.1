"use server";

import { notFound } from "next/navigation";
import { z } from "zod";

import { adminDb, requireAdmin } from "@/lib/server/admin";
import { drizzleDraftAuditStore, generateDraft } from "@/lib/server/aiDraft";
import { questionSchema } from "@/lib/community/questions";

// U9 — the one new action this unit adds: suggest a draft, never publish one.
//
// Publishing is still `answerQuestion` in `app/admin/actions.ts`, completely
// unchanged by this file. What comes back from `suggestDraft` is text for the
// admin's own textarea, on the admin's own request — nothing here can reach a
// user without that separate, existing, audited approval step.
//
// Same four steps as every action in `app/admin/actions.ts`: authorise,
// validate, act, and — inside `generateDraft` itself — audit. The audit row
// for a draft attempt is written before the model is even called (see
// `lib/server/aiDraft.ts`), so this action does not write a second one.

export interface DraftActionState {
  draft?: string;
  error?: string;
}

const SuggestSchema = z
  .object({
    questionId: z.string().min(1).max(64),
    question: questionSchema,
  })
  .strict();

/** The copy shown for a reason the admin cannot fix by trying again. */
const DRAFT_ERROR_COPY: Record<"cap-reached" | "no-draft" | "disabled", string> = {
  disabled: "La sugerencia de borrador no está disponible ahora.",
  "cap-reached":
    "Ya se generaron los borradores disponibles hoy. Escribí la respuesta vos misma.",
  "no-draft": "No pudimos generar un borrador. Escribí la respuesta directamente.",
};

export async function suggestDraft(
  _previous: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = SuggestSchema.safeParse({
    questionId: formData.get("questionId"),
    question: formData.get("question"),
  });
  if (!parsed.success) return { error: "Pedido inválido." };

  const result = await generateDraft(
    drizzleDraftAuditStore(database),
    actor.id,
    parsed.data.questionId,
    parsed.data.question,
  );

  if (!result.ok) return { error: DRAFT_ERROR_COPY[result.failure] };
  return { draft: result.draft };
}
