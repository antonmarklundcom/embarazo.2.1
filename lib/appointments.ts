// BUILD-PLAN K8 — the prenatal control as a shared object
// (docs/FABLE-PLAN-2026-08.md §3).
//
// Two things live here, both pure:
//
//   1. **A control can now have a time.** It was date-only, which was fine
//      while only the mamá read it and useless the moment somebody else has to
//      decide whether they can be there. Storage did not change — it is still
//      one epoch-ms number — because adding a second field would mean a Dexie
//      migration, a sync-payload change and a snapshot column for information
//      the same number already carries.
//   2. **The sentences.** B5's design has the server send a poke with no body
//      and the *device* write the words; K8 extends that to a second device
//      that is not the pregnant user's. So the phrasing has to be composable
//      from a timestamp alone, on a phone, offline — which is what these
//      functions are.
//
// Everything is computed in **local time**. `toISOString().slice(0, 10)` is the
// tempting one-liner and it is wrong here: it renders a UTC date, so an
// appointment at 21:00 in Asunción (UTC-3) reports as the following day.

/**
 * Whether a stored appointment carries a time of day.
 *
 * The convention is that local midnight means "date only" — nobody has a
 * prenatal control at 00:00, and treating that one minute as unspecified costs
 * nothing while letting the whole feature stay a single number. Stated here so
 * it is a documented rule rather than an accident of how the picker saved it.
 */
export function hasTimeOfDay(ts: number): boolean {
  const date = new Date(ts);
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

/** `<input type="date">` value for a timestamp, in local time. */
export function toDateInput(ts: number | undefined | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `<input type="time">` value, or "" when the appointment is date-only. */
export function toTimeInput(ts: number | undefined | null): string {
  if (!ts || !hasTimeOfDay(ts)) return "";
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Combine the two inputs into the one stored number.
 *
 * An empty date is "no appointment" — clearing the date clears the control,
 * and a time with no date is not an appointment at all. An empty time falls
 * back to local midnight, which `hasTimeOfDay` then reports as date-only.
 */
export function combineDateTime(
  dateInput: string,
  timeInput: string,
): number | undefined {
  if (!dateInput) return undefined;
  const [year, month, day] = dateInput.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  let hours = 0;
  let minutes = 0;
  if (timeInput) {
    const [h, m] = timeInput.split(":").map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      hours = h!;
      minutes = m!;
    }
  }

  const ts = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  return Number.isFinite(ts) ? ts : undefined;
}

/**
 * 24-hour, always.
 *
 * `es-PY` defaults to a 12-hour clock and renders "09:00 a. m." — which reads
 * as a machine wrote it, and produced "a las 09:00 a. m.." in a sentence. A
 * carné perinatal says 09:00; so do we.
 */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "jueves 21 de agosto a las 09:00", or just the day when there is no time. */
export function formatAppointment(ts: number): string {
  const day = formatDay(ts);
  return hasTimeOfDay(ts) ? `${day} a las ${formatTime(ts)}` : day;
}

/**
 * How far away an appointment is, in whole local days.
 *
 * Days, not hours: "mañana" has to mean the calendar day after this one, so a
 * control at 08:00 tomorrow is "mañana" even though it is 20 hours away, and
 * one at 23:00 tonight is "hoy" even though it is 21 hours away.
 */
export function daysUntil(appointmentAt: number, now: number): number {
  const startOfDay = (ts: number) => {
    const date = new Date(ts);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
  };
  return Math.round(
    (startOfDay(appointmentAt) - startOfDay(now)) / (24 * 60 * 60 * 1000),
  );
}

export interface ReminderSentence {
  title: string;
  body: string;
}

/**
 * What the **mamá's** phone says when the poke arrives.
 *
 * Returns null when the appointment cannot explain this notification — it
 * moved, or it was cleared, between scheduling and firing. The caller then
 * falls back to something true and useless rather than something specific and
 * wrong (B5's rule, and `userVisibleOnly: true` means it must say *something*).
 */
export function ownReminderSentence(
  appointmentAt: number | null,
  now: number,
): ReminderSentence | null {
  if (appointmentAt === null) return null;
  const days = daysUntil(appointmentAt, now);
  if (days < 0 || days > 1) return null;

  const when = days === 0 ? "Hoy" : "Mañana";
  return {
    title: `${when} tenés control prenatal`,
    body: hasTimeOfDay(appointmentAt)
      ? `A las ${formatTime(appointmentAt)}. Llevá tu carné perinatal.`
      : "Llevá tu carné perinatal.",
  };
}

/**
 * What the **companion's** phone says.
 *
 * The plan's own line — "Acompañala al control el jueves a las 9:00" — is the
 * whole point of K8: an invitation to be there, not a notification that
 * something exists. Same null contract as above.
 */
export function companionReminderSentence(
  appointmentAt: number | null,
  now: number,
): ReminderSentence | null {
  if (appointmentAt === null) return null;
  const days = daysUntil(appointmentAt, now);
  if (days < 0 || days > 1) return null;

  const when = days === 0 ? "hoy" : "mañana";
  return {
    title: "Acompañala al control",
    body: hasTimeOfDay(appointmentAt)
      ? `Es ${when} a las ${formatTime(appointmentAt)}.`
      : `Es ${when}.`,
  };
}

/**
 * Is this member coming to *this* appointment?
 *
 * The marker stores the timestamp it was given, not a boolean, so a control
 * that moves silently invalidates every "yo la acompaño" instead of quietly
 * reassigning them to a date nobody agreed to. She sees an empty list and
 * asks again, which is the correct outcome and the safe direction to fail in.
 */
export function isAccompanying(
  accompanyingAt: number | null | undefined,
  appointmentAt: number | null | undefined,
): boolean {
  if (!accompanyingAt || !appointmentAt) return false;
  return accompanyingAt === appointmentAt;
}
