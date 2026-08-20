"use client";

import { useEffect, useState } from "react";

import {
  combineDateTime,
  daysUntil,
  formatAppointment,
  isAccompanying,
  toDateInput,
  toTimeInput,
} from "@/lib/appointments";
import { saveNextAppointment } from "@/lib/appointments.client";
import type { MemberRole } from "@/lib/sharing/fields";

// K7 (§7 scope add) — the próximo control, edited where it is read.
//
// The home shortcut used to be a tile labelled "Próximo control · Anotá la
// fecha" that navigated to `/ajustes`, where the field sits three groups down
// past "Modo de uso" and the due-date calculator. The thing a woman actually
// does — comes out of a consultation with the next date on a slip of paper —
// took four taps and a hunt, on the screen that already shows her the date.
//
// Three things this shows that the tile could not:
//
//   • **How far away it is.** "En 3 días" is the answer to the question she is
//     actually asking; the date is how the answer is verified.
//   • **Who is coming** (K8). Roles, never names — E1 shares no names between
//     members and this does not start.
//   • **A time**, optional, because a control at 09:00 and a control "on
//     Thursday" are different amounts of planning.
//
// The write goes through `saveNextAppointment`, shared with the Ajustes editor,
// so both re-schedule the push and republish the companion snapshot.
//
// **This replaced <AppointmentBanner> as well as the shortcut tile.** The
// banner was the urgent form — it appeared within three days of the control or
// once it had passed, carrying the date, the RSVP, and a link to /ajustes. Once
// this card exists it is a strict subset of it, and shipping both put "Te
// acompaña tu pareja." on the screen twice (an existing e2e caught exactly
// that). So the urgency is a *tone* on this card rather than a second card,
// and the past-control nudge — the genuinely useful half of the banner — is the
// heading below.

const ACCOMPANIST_LABEL: Record<Exclude<MemberRole, "owner">, string> = {
  partner: "tu pareja",
  family: "alguien de tu familia",
};

export interface AppointmentGuest {
  role: MemberRole;
  accompanyingAt: number | null;
}

function whenLabel(at: number, now: number): string {
  const days = daysUntil(at, now);
  if (days < 0) return days === -1 ? "Fue ayer" : `Fue hace ${-days} días`;
  if (days === 0) return "Es hoy";
  if (days === 1) return "Es mañana";
  return `En ${days} días`;
}

/**
 * The three tones the old banner encoded as three components.
 *
 * `soon` is within three days, matching the banner's window exactly, so the
 * card gets louder at the same moment the banner used to appear.
 */
function toneFor(at: number | undefined, now: number): "empty" | "calm" | "soon" | "past" {
  if (!at) return "empty";
  const days = daysUntil(at, now);
  if (days < 0) return "past";
  return days <= 3 ? "soon" : "calm";
}

const TONE_CLASS = {
  empty: "bg-cream",
  calm: "bg-pastel-salvia",
  soon: "bg-petrol/10 border border-petrol/25",
  past: "bg-terracotta/5 border border-terracotta/30",
} as const;

function guestLine(guests: AppointmentGuest[], at: number): string | null {
  const coming = guests
    .filter((guest) => guest.role !== "owner")
    .filter((guest) => isAccompanying(guest.accompanyingAt, at));
  if (coming.length === 0) return null;
  const labels = [
    ...new Set(
      coming.map(
        (guest) => ACCOMPANIST_LABEL[guest.role as Exclude<MemberRole, "owner">],
      ),
    ),
  ];
  return `Te acompaña ${labels.join(" y ")}.`;
}

export function NextAppointmentCard({
  appointmentAt,
  guests = [],
  companionAppointmentAt = null,
}: {
  appointmentAt?: number;
  /** K8 — who said they would come. Used only to say so, never by name. */
  guests?: AppointmentGuest[];
  /** K8 — this device's own "yo la acompaño", re-sent with the schedule. */
  companionAppointmentAt?: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(toDateInput(appointmentAt));
    setTime(toTimeInput(appointmentAt));
  }, [appointmentAt]);

  async function save() {
    setBusy(true);
    await saveNextAppointment(combineDateTime(date, time), companionAppointmentAt);
    setBusy(false);
    setEditing(false);
  }

  async function clear() {
    setBusy(true);
    await saveNextAppointment(undefined, companionAppointmentAt);
    setBusy(false);
    setEditing(false);
  }

  const now = Date.now();
  const coming = appointmentAt ? guestLine(guests, appointmentAt) : null;
  const tone = toneFor(appointmentAt, now);

  return (
    // aria-label, not aria-labelledby: the heading is the date itself, which
    // is the content, not the name of the landmark.
    <section
      aria-label="Próximo control"
      className={`rounded-card p-4 ${TONE_CLASS[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[11px] font-extrabold uppercase tracking-[1.6px] ${
              tone === "past" ? "text-terracotta" : "text-petrol"
            }`}
          >
            {tone === "past" ? "Control prenatal" : "Próximo control"}
          </p>
          <h3 className="mt-1 text-base font-extrabold leading-tight text-ink">
            {appointmentAt ? formatAppointment(appointmentAt) : "Todavía no anotaste ninguno"}
          </h3>
          {appointmentAt && (
            <p
              className={`mt-0.5 text-sm font-extrabold ${
                tone === "past" ? "text-terracotta" : "text-petrol"
              }`}
            >
              {whenLabel(appointmentAt, now)}
              {tone === "past" && " · ¿ya fuiste? anotá el próximo"}
            </p>
          )}
          {coming && (
            <p className="mt-1 text-[13px] font-semibold text-ink/70">{coming}</p>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full bg-white/80 px-3 py-2 text-[13px] font-extrabold text-petrol transition active:scale-[0.98]"
          >
            {appointmentAt ? (tone === "past" ? "Actualizar" : "Cambiar") : "Anotar"}
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Fecha del control</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
              />
            </label>
            <label className="w-[7.5rem]">
              {/* Optional on purpose: a carné often says "jueves" and nothing
                  more, and demanding a time she does not have would make her
                  invent one. */}
              <span className="sr-only">Hora (opcional)</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !date}
              onClick={() => void save()}
              className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            {appointmentAt && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void clear()}
                className="min-h-[44px] rounded-tile bg-white px-4 text-sm font-extrabold text-terracotta shadow-soft disabled:opacity-60"
              >
                Quitar
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="min-h-[44px] rounded-tile bg-white/70 px-4 text-sm font-extrabold text-petrol"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
