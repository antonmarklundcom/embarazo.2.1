"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const GOAL = 10;
const SESSION_MS = 2 * 60 * 60 * 1000; // 2h goal window

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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Pataditas</h1>
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
            aria-label="Registrar una pataditas"
          >
            <span className="text-6xl font-medium">{count}</span>
            <span className="mt-1 text-sm text-muted">
              {count >= GOAL ? "¡Meta alcanzada!" : `de ${GOAL} movimientos`}
            </span>
          </button>
          <p className="text-sm text-muted">
            Tiempo de la sesión: {fmtDuration(elapsed)}
            {elapsed > SESSION_MS && " (pasaste las 2 horas)"}
          </p>
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
        Si notás menos movimiento de lo habitual, contactá a tu sanatorio.
      </div>

      {sessions && sessions.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink">Sesiones anteriores</h2>
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
