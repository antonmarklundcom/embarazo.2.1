"use client";

import { db } from "@/lib/db";
import { refreshReminders } from "@/lib/push/client";
import { publishCompanionSnapshot } from "@/lib/sharing/client";

// K7 (§7) — one place that writes `profile.nextAppointment`.
//
// It lives beside `lib/appointments.ts` rather than inside it, and the split is
// load-bearing: `appointments.ts` is imported by `app/sw.ts`, so it must stay
// pure and free of Dexie, `next/*` and anything with a window. This half is the
// browser half.
//
// The home screen's "Próximo control" shortcut used to be a link that dumped
// the user into `/ajustes` to hunt for a date field. It now edits in place —
// and the moment there are two editors, there are two chances to forget one of
// the three things a saved appointment has to do:
//
//   1. **Write it to Dexie**, which is the source of truth.
//   2. **Re-send the push schedule** (B5). The server holds a fire time, not an
//      appointment, so a moved control that is not re-scheduled fires the old
//      reminder for a control that is not happening. The `companionAppointmentAt`
//      argument is K8's other half: the schedule is replaced wholesale, so a
//      device that is *also* accompanying somebody must re-send that poke in
//      the same breath, or editing her own control silently cancels his.
//   3. **Republish the companion snapshot** (E1/K8), or her pareja is looking
//      at last month's date. Before K7 the Ajustes editor did not do this
//      either — it waited for the next app open. Fixing it here fixes it for
//      both callers, which is the argument for extracting this at all.
//
// Best-effort by design: 2 and 3 are network calls that must not stop 1. A
// woman on a bus who changes the date of her control has changed it.

export async function saveNextAppointment(
  value: number | undefined,
  companionAppointmentAt: number | null = null,
): Promise<void> {
  const rows = await db().profile.toArray();
  const first = rows[0];
  if (!first?.id) return;

  await db().profile.update(first.id, { nextAppointment: value });

  await refreshReminders(companionAppointmentAt);
  // Returns false offline or without an account. Both are ordinary.
  await publishCompanionSnapshot();
}
