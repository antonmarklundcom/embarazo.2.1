"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { adminDb, recordAudit, requireAdmin } from "@/lib/server/admin";
import {
  forceResync,
  removeDevice,
  restoreRecord,
  revokeAllSessions,
  revokeMembership,
} from "@/lib/server/support";
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

// ---------------------------------------------------------------------------
// BUILD-PLAN I1 / U6 — the five support repairs
// ---------------------------------------------------------------------------
//
// Same four steps in the same order as everything above — authorise, validate,
// act, audit — and the same reason for each: a server action is a POST
// endpoint that inherits nothing from the page somebody reached it from, and
// §9 makes the audit row the thing that justifies the access.
//
// Every one of these acts on a user id that comes from the FORM. That is safe
// only because `requireAdmin()` has already run and the actor comes from the
// session, never from the request — the id in the form says which account is
// being repaired, and the audit row records who repaired it.

const MembershipSchema = z.object({ id: z.string().min(1).max(64) }).strict();
const DeviceSchema = z
  .object({
    userId: z.string().min(1).max(255),
    subscriptionId: z.string().min(1).max(64),
  })
  .strict();
const RestoreSchema = z
  .object({
    userId: z.string().min(1).max(255),
    store: z.string().min(1).max(64),
    recordId: z.string().min(1).max(128),
  })
  .strict();

/** "Sacá a mi ex del embarazo." E1 makes this immediate — nothing is cached. */
export async function supportRevokeMembership(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = MembershipSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: "Pedido inválido." };

  const revoked = await revokeMembership(database, parsed.data.id);
  if (!revoked) return { error: "Esa membresía ya no existe." };

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "member_revoked",
    targetUserId: revoked.memberUserId,
    meta: {
      pregnancyId: revoked.pregnancyId,
      memberUserId: revoked.memberUserId,
    },
  });

  revalidatePath("/admin");
  return { ok: "Acceso cortado. Deja de ver todo ahora mismo." };
}

/** A lost phone: forget the device so it stops receiving notifications. */
export async function supportRemoveDevice(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = DeviceSchema.safeParse({
    userId: formData.get("userId"),
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) return { error: "Pedido inválido." };

  const removed = await removeDevice(
    database,
    parsed.data.userId,
    parsed.data.subscriptionId,
  );
  if (!removed) return { error: "Ese dispositivo ya no está." };

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "device_removed",
    targetUserId: parsed.data.userId,
    meta: { subscriptionId: parsed.data.subscriptionId },
  });

  revalidatePath("/admin");
  return { ok: "Dispositivo quitado. No recibe más avisos." };
}

/** A stolen phone: end every session the account has open, everywhere. */
export async function supportRevokeSessions(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = UserIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Pedido inválido." };

  await revokeAllSessions(database, parsed.data.userId);

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "sessions_revoked",
    targetUserId: parsed.data.userId,
  });

  revalidatePath("/admin");
  return {
    ok: "Se cerraron todas las sesiones. Puede volver a entrar con su contraseña.",
  };
}

/** "Perdí mis datos": tell every device to pull the whole account again. */
export async function supportForceResync(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = UserIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Pedido inválido." };

  await forceResync(database, parsed.data.userId);

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "resync_forced",
    targetUserId: parsed.data.userId,
  });

  revalidatePath("/admin");
  return {
    ok: "Listo. Cada dispositivo vuelve a bajar todo en su próxima sincronización.",
  };
}

/**
 * Un-delete one record.
 *
 * What comes back is the record, not necessarily its contents: a delete drops
 * the body (`toPayload`, lib/sync/merge.ts), so this can only restore on a
 * device that still holds it locally. The screen says so; see
 * `restoreRecord` for why that is safe rather than destructive.
 */
export async function supportRestoreRecord(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const parsed = RestoreSchema.safeParse({
    userId: formData.get("userId"),
    store: formData.get("store"),
    recordId: formData.get("recordId"),
  });
  if (!parsed.success) return { error: "Pedido inválido." };

  const restored = await restoreRecord(
    database,
    parsed.data.userId,
    parsed.data.store,
    parsed.data.recordId,
    Date.now(),
  );
  if (!restored) return { error: "Ese registro ya no figura como borrado." };

  await recordAudit(database, {
    actorUserId: actor.id,
    action: "record_restored",
    targetUserId: parsed.data.userId,
    meta: { store: parsed.data.store, recordId: parsed.data.recordId },
  });

  revalidatePath("/admin");
  return {
    ok: "Restaurado. Vuelve a aparecer en el próximo sync de un teléfono que todavía lo tenga.",
  };
}
