"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type KickSession } from "@/lib/db";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import {
  kickBaseline,
  kickNudge,
  kickWindowMissed,
  KICK_GOAL as GOAL,
  KICKS_NUDGE_HINT,
  KICKS_WINDOW_ALERT,
} from "@/lib/tools/kicks";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default function PataditasPage() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [, setTick] = useState(0);

  // Re-render every 30 s while a session is open. Without it the clock and
  // the 2-hour alert below only moved when she tapped — and the case the alert
  // exists for is precisely the one where she has stopped tapping because the
  // baby has stopped moving.
  useEffect(() => {
    if (activeId === null) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [activeId]);

  const sessions = useLiveQuery(
    () => db().kickSessions.orderBy("startedAt").reverse().limit(10).toArray(),
    [],
  );
  const active = useLiveQuery(
    () => (activeId ? db().kickSessions.get(activeId) : undefined),
    [activeId],
  );

  async function startSession() {
    const id = await db().kickSessions.add({
      startedAt: Date.now(),
      count: 0,
    });
    setActiveId(id);
  }

  async function addKick() {
    if (!activeId || !active) return;
    const newCount = active.count + 1;
    const reached = newCount >= GOAL;
    await db().kickSessions.update(activeId, {
      count: newCount,
      ...(reached && !active.completedAt ? { completedAt: Date.now() } : {}),
    });
  }

  async function finishSession() {
    if (!activeId) return;
    const s = await db().kickSessions.get(activeId);
    if (s && !s.completedAt) {
      await db().kickSessions.update(activeId, { completedAt: Date.now() });
    }
    setActiveId(null);
  }

  const count = active?.count ?? 0;
  const elapsed = active ? Date.now() - active.startedAt : 0;
  const windowMissed = active ? kickWindowMissed(count, elapsed) : false;

  // D7 — compare today's most recently *completed* session against her own
  // last 7, never against a universal number. `sessions` is already ordered
  // newest-first.
  const completedSessions = (sessions ?? []).filter(
    (s): s is KickSession & { completedAt: number } =>
      s.completedAt !== undefined && s.completedAt > s.startedAt,
  );
  const [today, ...priorSessions] = completedSessions;
  const baseline = kickBaseline(priorSessions);
  const nudge = today ? kickNudge(today, baseline) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Pataditas</h1>
        <p className="text-sm text-muted">
          Tocá el círculo cada vez que sientas un movimiento. La meta es sentir{" "}
          {GOAL} movimientos en hasta 2 horas.
        </p>
      </header>

      {!activeId ? (
        <button
          type="button"
          onClick={startSession}
          className="min-h-[44px] w-full rounded-tile bg-petrol px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Empezar una sesión
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={addKick}
            className="flex h-56 w-56 flex-col items-center justify-center rounded-full bg-rose/20 text-petrol-dark shadow-soft transition active:scale-[0.97]"
            aria-label="Registrar una patadita"
          >
            <span className="text-6xl font-medium">{count}</span>
            <span className="mt-1 text-sm text-muted">
              {count >= GOAL ? "¡Meta alcanzada!" : `de ${GOAL} movimientos`}
            </span>
          </button>
          <p className="text-sm text-muted">
            Tiempo de la sesión: {fmtDuration(elapsed)}
          </p>
          {/* Two hours without reaching the goal is the counting method's own
              "fewer movements than expected" — it was a muted "(pasaste las 2
              horas)" after the clock. Now an alert with a real way out. */}
          {windowMissed && (
            <div
              role="alert"
              className="w-full space-y-3 rounded-card border-2 border-terracotta bg-terracotta/15 p-4 text-sm text-ink"
            >
              <p className="font-extrabold">{KICKS_WINDOW_ALERT.es}</p>
              <Link
                href="/emergencia"
                className="block rounded-tile bg-terracotta px-3 py-2.5 text-center text-sm font-extrabold text-white transition active:scale-[0.99]"
              >
                Ir a Emergencia
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={finishSession}
            className="min-h-[44px] w-full rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
          >
            Terminar sesión
          </button>
        </div>
      )}

      <div className="rounded-card border border-terracotta/20 bg-terracotta/5 p-4 text-sm text-ink">
        Si notás menos movimiento de lo habitual, contactá a tu médico/a,
        hospital o sanatorio.
      </div>
      <MedicalReviewByline />

      {nudge && (
        <div
          role="alert"
          className="space-y-2 rounded-card border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-ink"
        >
          <p className="font-extrabold">{KICKS_NUDGE_HINT.es}</p>
          <Link href="/emergencia" className="inline-block font-extrabold text-terracotta underline">
            Ver señales de alarma y números de emergencia
          </Link>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-ink">Sesiones anteriores</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-tile bg-white px-4 py-3 text-sm shadow-soft"
              >
                <span className="text-muted">{fmtTime(s.startedAt)}</span>
                <span className="font-medium text-ink">
                  {s.count} {s.count === 1 ? "movimiento" : "movimientos"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
