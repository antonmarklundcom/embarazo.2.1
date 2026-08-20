"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { adminDb, recordAudit, requireAdmin } from "@/lib/server/admin";
import { deleteAccountData, drizzleAccountExecutor } from "@/lib/server/account";
import { invites } from "@/lib/server/schema";
import { approveQuestion, rejectQuestion } from "@/lib/server/questions";
import {
  ANSWER_MAX,
  ANSWER_MIN,
  answerSchema,
} from "@/lib/community/questions";

// BUILD-PLAN A7 — the three mutating admin actions.
//
// Each one does the same four things in the same order, and the order is the
// point: authorise (404 for anyone else), validate, act, audit. The audit
// write is not optional and not conditional — ARCHITECTURE.md §9 makes it the
// thing that justifies the access existing at all.
//
// Every action re-authorises. A server action is a POST endpoint like any
// other: it does not inherit the layout's guard just because the user reached
// it from a rendered page.

const UserIdSchema = z.object({ userId: z.string().min(1).max(255) }).strict();
const InviteSchema = z.object({ code: z.string().min(1).max(32) }).strict();

export interface AdminActionState {
  error?: string;
  ok?: string;
}

/** Extra days a repaired invite gets. Long enough to be useful once. */
const INVITE_EXTENSION_DAYS = 7;

/**
 * Support-requested account deletion.
 *
 * Reuses A5's `deleteAccountData` rather than re-implementing it, so there is
 * exactly one answer to "what does deletion remove" and the coverage test that
 * protects it (`TABLE_DISPOSITION`) protects this path too.
 */
export async function supportDeleteAccount(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = UserIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Pedido inválido." };

  const counts = await deleteAccountData(
    drizzleAccountExecutor(database),
    parsed.data.userId,
  );

  // The counts are metadata about the deletion, not content — how many rows
  // per table went, which is exactly what a support ticket needs to answer.
  await recordAudit(database, {
    actorUserId: actor.id,
    action: "user_deleted",
    targetUserId: parsed.data.userId,
    meta: { counts },
  });

  revalidatePath("/admin");
  return { ok: "Cuenta borrada. Queda registrado en la auditoría." };
}

export async function revokeInvite(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = InviteSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Código inválido." };

  await database
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(invites.code, parsed.data.code), isNull(invites.revokedAt)),
    );

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "invite_revoked",
    meta: { code: parsed.data.code },
  });

  revalidatePath("/admin");
  return { ok: "Invitación anulada." };
}

/**
 * Repair an invite that expired before the person managed to use it.
 *
 * Extends rather than re-issues: the code is already in a WhatsApp message
 * somebody is looking at, and handing them a new one is how support tickets
 * turn into two support tickets.
 */
export async function extendInvite(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = InviteSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Código inválido." };

  const expiresAt = new Date(
    Date.now() + INVITE_EXTENSION_DAYS * 24 * 60 * 60 * 1000,
  );

  await database
    .update(invites)
    .set({ expiresAt, revokedAt: null })
    .where(eq(invites.code, parsed.data.code));

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "invite_extended",
    meta: { code: parsed.data.code, days: INVITE_EXTENSION_DAYS },
  });

  revalidatePath("/admin");
  return { ok: `Invitación reactivada por ${INVITE_EXTENSION_DAYS} días.` };
}

// ---------------------------------------------------------------------------
// K20 — the two editorial decisions
// ---------------------------------------------------------------------------

const AnswerSchema = z
  .object({
    questionId: z.string().min(1).max(64),
    answer: answerSchema,
  })
  .strict();

const QuestionIdSchema = z
  .object({ questionId: z.string().min(1).max(64) })
  .strict();

/**
 * Publish a question, with its answer.
 *
 * One action, not two, because approval and the answer are one decision. A
 * separate "approve" button would create a window in which an approved row has
 * no answer — and the public query is one careless `filter` away from
 * publishing a bare question in that window. Writing them together means the
 * state never exists to get wrong.
 *
 * The audit row carries the question's id and nothing else: not the question,
 * not the answer. `adminAudit` is the table deletion keeps, and a user's words
 * must not survive there after her account is gone.
 */
export async function answerQuestion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = AnswerSchema.safeParse({
    questionId: formData.get("questionId"),
    answer: formData.get("answer"),
  });
  if (!parsed.success) {
    return {
      error: `La respuesta tiene que tener entre ${ANSWER_MIN} y ${ANSWER_MAX} caracteres.`,
    };
  }

  const done = await approveQuestion(
    database,
    parsed.data.questionId,
    actor.id,
    parsed.data.answer,
  );
  if (!done) return { error: "No encontramos esa pregunta." };

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "question_approved",
    meta: { questionId: parsed.data.questionId },
  });

  revalidatePath("/admin/preguntas");
  return { ok: "Publicada." };
}

/**
 * Decline to publish.
 *
 * The row stays, unanswered, and the asker is told. A question that vanishes
 * silently reads as a bug and gets asked again — and "we are not answering
 * this here" is genuinely useful when the honest answer is "ask your doctor".
 */
export async function declineQuestion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = QuestionIdSchema.safeParse({
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return { error: "Pedido inválido." };

  const done = await rejectQuestion(database, parsed.data.questionId, actor.id);
  if (!done) return { error: "No encontramos esa pregunta." };

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "question_rejected",
    meta: { questionId: parsed.data.questionId },
  });

  revalidatePath("/admin/preguntas");
  return { ok: "No publicada." };
}
