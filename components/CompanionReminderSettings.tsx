"use client";

import { useEffect, useState } from "react";

import { db, notDeleted } from "@/lib/db";
import { formatAppointment } from "@/lib/appointments";
import { setCompanionReminder } from "@/lib/push/client";
import type { SharedView } from "@/lib/sharing/client";

// BUILD-PLAN K8 — "acompañala al control", in the companion's own settings.
//
// Renders nothing at all unless this device is accompanying somebody: there is
// no toggle for a reminder about an appointment that does not exist, and an
// empty "no estás acompañando a nadie" row in Ajustes is noise for the ~all of
// users who are the pregnant one.
//
// The reminder itself is B5's design unchanged — the server is told a list of
// epoch milliseconds and never what they are for. What is new is only *which*
// appointment produced the timestamp, and that the sentence the phone writes
// when it fires is addressed to the person coming along rather than to the
// person being examined.

export function CompanionReminderSettings({
  view,
}: {
  view: SharedView | null;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = notDeleted(await db().profile.toArray())[0];
        if (!cancelled) setEnabled(profile?.companionReminder === true);
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!view) return null;

  const appointmentAt = view.snapshot?.nextAppointmentAt ?? null;
  const on = enabled === true;

  async function toggle() {
    const next = !on;
    setEnabled(next);
    setBusy(true);
    await setCompanionReminder(next, appointmentAt);
    setBusy(false);
  }

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <h3 className="text-[15px] font-extrabold text-ink">
        Avisame de su control
      </h3>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
        Te avisamos el día antes del control prenatal, para que puedas
        acompañarla.
      </p>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy || enabled === null}
        onClick={() => void toggle()}
        className={`mt-3 flex min-h-[44px] w-full items-center gap-3 rounded-tile border px-3 py-2.5 text-left disabled:opacity-60 ${
          on ? "border-petrol/30 bg-pastel-salvia" : "border-line bg-cream"
        }`}
      >
        <span
          aria-hidden
          className={`flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition ${
            on ? "justify-end bg-petrol" : "justify-start bg-ink/20"
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-white" />
        </span>
        <span className="text-sm font-extrabold text-ink">
          Acompañala al control
        </span>
      </button>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        {appointmentAt
          ? `El próximo es el ${formatAppointment(appointmentAt)}.`
          : "Todavía no cargó su próximo control. Cuando lo haga, el aviso se programa solo."}
      </p>
    </section>
  );
}
