"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { waLink, defaultPrefill, businessWhatsApp } from "@/lib/whatsapp";

// C8 — this button said "Contactar a mi sanatorio" and opened a chat with
// `+595000000000`: Mi Bebé's own (unset) business number, on the screen a woman
// uses while timing contractions. Two things were wrong, and both are fixed
// below: the number was a placeholder, and *our* number was never the right
// destination for "mi sanatorio" in the first place. It now uses the sanatorio
// number the user saved herself (/emergencia), and falls back to the emergency
// screen — which carries the national numbers — when she has not saved one.
const BUSINESS_WA = businessWhatsApp(process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP);

function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ContraccionesPage() {
  const profile = useProfile();
  const [runningStart, setRunningStart] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const entries = useLiveQuery(
    () => db().contractionEntries.orderBy("startedAt").reverse().limit(20).toArray(),
    [],
  );

  // Re-render every second while timing.
  useEffect(() => {
    if (runningStart === null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [runningStart]);

  async function stop() {
    if (runningStart === null) return;
    const now = Date.now();
    const durationSec = Math.round((now - runningStart) / 1000);
    // Interval = gap from the previous contraction's start to this one's start.
    const last = await db().contractionEntries.orderBy("startedAt").last();
    const intervalSec = last
      ? Math.round((runningStart - last.startedAt) / 1000)
      : 0;
    await db().contractionEntries.add({
      startedAt: runningStart,
      durationSec,
      intervalSec,
    });
    setRunningStart(null);
  }

  const elapsed =
    runningStart !== null ? Math.round((Date.now() - runningStart) / 1000) : 0;

  const sanatorio = profile.sanatorioPhone?.trim();
  const waHref = sanatorio
    ? waLink(sanatorio, defaultPrefill(profile.week))
    : BUSINESS_WA
      ? waLink(BUSINESS_WA, defaultPrefill(profile.week))
      : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Contracciones</h1>
        <p className="text-sm text-muted">
          Tocá empezar cuando comience una contracción y parar cuando termine.
          Se registra la duración y el intervalo.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4 rounded-card bg-white p-6 shadow-soft">
        {runningStart === null ? (
          <button
            type="button"
            onClick={() => setRunningStart(Date.now())}
            className="flex h-40 w-40 items-center justify-center rounded-full bg-terracotta text-lg font-medium text-white transition active:scale-[0.97]"
          >
            Empezar
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-petrol text-white transition active:scale-[0.97]"
          >
            <span className="text-3xl font-black">{fmtSec(elapsed)}</span>
            <span className="mt-1 text-sm text-white/80">Parar</span>
          </button>
        )}
      </div>

      {waHref ? (
        <WhatsAppButton
          href={waHref}
          label={sanatorio ? "Contactar a mi sanatorio" : "Escribinos por WhatsApp"}
          className="w-full"
        />
      ) : (
        <Link
          href="/emergencia"
          className="block w-full rounded-tile bg-terracotta px-4 py-3 text-center text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          Números de emergencia y qué decir
        </Link>
      )}

      {entries && entries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-ink">Registro</h2>
          <div className="overflow-hidden rounded-card bg-white shadow-soft">
            <div className="grid grid-cols-3 border-b border-line px-4 py-2 text-xs font-medium text-muted">
              <span>Hora</span>
              <span className="text-center">Duración</span>
              <span className="text-right">Intervalo</span>
            </div>
            <ul>
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="grid grid-cols-3 border-b border-line px-4 py-2.5 text-sm last:border-0"
                >
                  <span className="text-muted">{fmtClock(e.startedAt)}</span>
                  <span className="text-center text-ink">{fmtSec(e.durationSec)}</span>
                  <span className="text-right text-ink">
                    {e.intervalSec > 0 ? fmtSec(e.intervalSec) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Esta herramienta es informativa. Si las contracciones son regulares y
        cada vez más seguidas, o ante cualquier duda, contactá a tu sanatorio.
      </p>
    </div>
  );
}
