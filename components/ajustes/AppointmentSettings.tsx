import { useEffect, useState } from "react";

import type { AppMode } from "@/lib/db";
import { combineDateTime, toDateInput, toTimeInput } from "@/lib/appointments";
import { saveNextAppointment } from "@/lib/appointments.client";

// W4: "Próximo control prenatal" (build spec §4), moved verbatim out of
// AjustesClient with its drafts, the effect that seeds them and its writers.
// Gate inside — see PregnancyDateSettings.
export function AppointmentSettings({
  mode,
  nextAppointment,
  companionAppointmentAt,
  today,
}: {
  mode: AppMode;
  nextAppointment: number | undefined;
  /**
   * K8 — fetched once in AjustesClient and passed down, rather than each
   * component asking: the push schedule is replaced wholesale on every
   * publish, so this editor and the notification toggles all have to know
   * about the companion poke or they will drop it.
   */
  companionAppointmentAt: number | null;
  today: string;
}) {
  // Next prenatal appointment (build spec §4).
  const [apptInput, setApptInput] = useState("");
  /** K8 — optional hour of the control. Blank means "date only". */
  const [apptTimeInput, setApptTimeInput] = useState("");
  const [apptMsg, setApptMsg] = useState("");

  useEffect(() => {
    setApptInput(toDateInput(nextAppointment));
    setApptTimeInput(toTimeInput(nextAppointment));
  }, [nextAppointment]);

  async function persistAppointment(value: number | undefined) {
    // K7: the write, the push re-schedule and the snapshot republish moved into
    // `lib/appointments/save.ts`, which the home screen's inline editor now
    // shares. Two editors for one field is two chances to forget one of the
    // three — see that file's comment for what each is for.
    await saveNextAppointment(value, companionAppointmentAt);
    setApptMsg(value ? "Control guardado." : "Control quitado.");
    setTimeout(() => setApptMsg(""), 2500);
  }

  async function saveAppointment() {
    // K8: date + optional time, combined into the one stored number. Local
    // midnight is the "no time given" convention (lib/appointments.ts).
    await persistAppointment(combineDateTime(apptInput, apptTimeInput));
  }

  async function clearAppointment() {
    setApptInput("");
    setApptTimeInput("");
    await persistAppointment(undefined);
  }

  if (mode !== "embarazada") return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">
        Próximo control prenatal
      </h2>
      <p className="mt-1 text-sm text-muted">
        Anotá la fecha de tu próximo control y te lo recordamos en Inicio.
        Solo en este dispositivo, sin notificaciones.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="appt-date"
          type="date"
          value={apptInput}
          min={today}
          onChange={(e) => setApptInput(e.target.value)}
          className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
        />
        {/* K8: optional, and optional in the honest sense — leaving it blank
            stores a date-only control and every sentence the app writes drops
            the hour rather than inventing 00:00. */}
        <input
          id="appt-time"
          type="time"
          aria-label="Hora del control (opcional)"
          value={apptTimeInput}
          onChange={(e) => setApptTimeInput(e.target.value)}
          className="min-h-[44px] w-[7.5rem] rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={saveAppointment}
          // Five buttons on this screen say "Guardar". Naming this one is an
          // accessibility fix as much as a test hook: "Guardar" alone tells a
          // screen-reader user nothing about which of them they are on.
          aria-label="Guardar el control"
          className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar
        </button>
        {apptInput && (
          <button
            type="button"
            onClick={clearAppointment}
            className="min-h-[44px] rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
          >
            Limpiar
          </button>
        )}
      </div>
      {apptMsg && <p className="mt-2 text-sm text-sage">{apptMsg}</p>}
    </section>
  );
}
