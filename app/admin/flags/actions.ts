"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/server/admin";
import { isFlagStoreAvailable, setFlag } from "@/lib/server/flags";
import { FLAG_KEYS, type FlagKey } from "@/lib/flags/keys";

// BUILD-PLAN I5 / U1 — the one mutating action this page has.
//
// Same order as every other admin action (`app/admin/actions.ts`): authorise
// (404 for anyone else), validate, act, audit. The audit half is not written
// here because `setFlag` writes the row and the audit in one transaction —
// there is deliberately no way to do one without the other.
//
// It re-authorises rather than trusting the layout: a server action is a POST
// endpoint like any other and does not inherit a guard from the page somebody
// happened to reach it from.

const ToggleSchema = z
  .object({
    // `z.enum` over the pinned key list, so an unknown key is a rejected
    // request rather than a row for a flag nothing reads.
    key: z.enum(FLAG_KEYS as [FlagKey, ...FlagKey[]]),
    value: z.enum(["true", "false"]),
  })
  .strict();

export interface FlagActionState {
  error?: string;
  ok?: string;
}

export async function toggleFlag(
  _previous: FlagActionState,
  formData: FormData,
): Promise<FlagActionState> {
  const actor = await requireAdmin();
  if (!isFlagStoreAvailable()) notFound();

  const parsed = ToggleSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) return { error: "Pedido inválido." };

  const value = parsed.data.value === "true";
  await setFlag(parsed.data.key, value, actor);

  revalidatePath("/admin/flags");
  return {
    ok: value
      ? "Activado. Puede tardar hasta un minuto en verse."
      : "Desactivado. Puede tardar hasta un minuto en verse.",
  };
}
