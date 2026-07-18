"use client";

import Link from "next/link";

// In-app reminder for the next prenatal control (build spec §4). NO push:
// purely informational, shown only near the date or once it has passed.
const DAY = 86_400_000;

function fmt(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function AppointmentBanner({ date }: { date?: number }) {
  if (!date) return null;

  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const isPast = date < startOfToday;
  const daysAway = Math.ceil((date - now) / DAY);

  // Only surface within 3 days, or once past.
  if (!isPast && daysAway > 3) return null;

  if (isPast) {
    return (
      <Link
        href="/ajustes"
        className="block rounded-card border border-terracotta/30 bg-terracotta/5 p-4 transition active:scale-[0.99]"
      >
        <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-terracotta">
          Control prenatal
        </p>
        <p className="mt-1 text-sm text-ink">
          Tu control era el {fmt(date)}. ¿Ya fuiste? Actualizá la fecha del
          próximo en Ajustes.
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/ajustes"
      className="block rounded-card border border-petrol/20 bg-petrol/5 p-4 transition active:scale-[0.99]"
    >
      <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-petrol">
        Próximo control
      </p>
      <p className="mt-1 text-sm text-ink">
        Tu próximo control es el {fmt(date)} — no te olvides.
      </p>
    </Link>
  );
}
