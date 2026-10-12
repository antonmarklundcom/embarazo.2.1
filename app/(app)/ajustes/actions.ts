"use server";

import { z } from "zod";

import { getSession, isAuthAvailable, signOut } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import { deleteAccountData, drizzleAccountExecutor } from "@/lib/server/account";

// BUILD-PLAN A5 — "Borrar mi cuenta".
//
// A server action is API surface: anyone can post to it, so its input is
// zod-whitelisted like every other boundary in this app (standing rule 4).
// The user id is never one of those inputs — it comes from the session, so
// this action cannot be aimed at somebody else's account no matter what is
// posted to it.

const DeleteAccountSchema = z
  .object({
    // A literal, not a boolean: an unticked checkbox is absent from FormData
    // entirely, so the only value that can satisfy this is a deliberate
    // confirmation. Same shape as A2's consent gate.
    confirm: z.literal("borrar"),
    expectedAccountId: z.string().min(1).max(128),
  })
  .strict();

export interface DeleteAccountState {
  error?: string;
  deleted?: boolean;
}

export async function deleteAccountAction(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const parsed = DeleteAccountSchema.safeParse({
    confirm: formData.get("confirm") ?? undefined,
    expectedAccountId: formData.get("expectedAccountId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "No pudimos confirmar el pedido. Probá de nuevo." };
  }

  if (!isAuthAvailable()) {
    return {
      error:
        "El ingreso no está disponible ahora. Conectate y volvé a intentar; tus registros locales no se borraron.",
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { error: "Tu sesión venció. Entrá de nuevo y reintentá." };

  if (parsed.data.expectedAccountId !== userId) {
    return { error: "Tu cuenta cambió. Volvé a entrar antes de borrar la cuenta." };
  }

  const database = dbOrNull();
  if (!database) {
    return { error: "No pudimos conectarnos ahora mismo. Probá más tarde." };
  }

  await deleteAccountData(drizzleAccountExecutor(database), userId);

  // Sign out last, and only after the rows are gone: a session that outlives
  // its user row would look to the app like a working account with no data,
  // which is exactly the "perdí mis datos" support ticket A7 exists to answer.
  // Return the acknowledged deletion before the client revokes its gated UI.
  // A cookie-clearing failure must not claim that already-deleted data exists.
  try { await signOut({ redirect: false }); } catch { /* Client verifies sign-out. */ }
  return { deleted: true };
}
