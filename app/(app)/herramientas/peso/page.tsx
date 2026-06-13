"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "short",
  });
}

function TrendChart({ points }: { points: { date: number; kg: number }[] }) {
  if (points.length < 2) return null;
  const W = 320;
  const H = 120;
  const pad = 12;
  const kgs = points.map((p) => p.kg);
  const minKg = Math.min(...kgs);
  const maxKg = Math.max(...kgs);
  const span = maxKg - minKg || 1;
  const xs = points.map((_, i) => pad + (i * (W - 2 * pad)) / (points.length - 1));
  const ys = points.map(
    (p) => H - pad - ((p.kg - minKg) / span) * (H - 2 * pad),
  );
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Gráfico de evolución del peso"
    >
      <path d={d} fill="none" stroke="#1F5F5B" strokeWidth="2" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="#D9714B" />
      ))}
    </svg>
  );
}

export default function PesoPage() {
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const entries = useLiveQuery(
    () => db().weightEntries.orderBy("date").toArray(),
    [],
  );

  async function add() {
    const value = parseFloat(kg.replace(",", "."));
    if (!value || value <= 0 || value > 300) return;
    await db().weightEntries.add({
      date: new Date(`${date}T00:00:00`).getTime(),
      kg: Math.round(value * 10) / 10,
    });
    setKg("");
  }

  async function remove(id?: number) {
    if (id) await db().weightEntries.delete(id);
  }

  const ordered = entries ?? [];
  const reversed = [...ordered].reverse();
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const diff = first && last ? Math.round((last.kg - first.kg) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Peso</h1>
        <p className="text-sm text-muted">
          Anotá tu peso en los controles para ver tu evolución.
        </p>
      </header>

      <div className="rounded-card bg-white p-4 shadow-soft">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="kg" className="block text-xs text-muted">
              Peso (kg)
            </label>
            <input
              id="kg"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="68,5"
              className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="date" className="block text-xs text-muted">
              Fecha
            </label>
            <input
              id="date"
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-2 py-2 focus:border-petrol focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!kg}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Guardar
        </button>
      </div>

      {ordered.length >= 2 && (
        <div className="rounded-card bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-ink">Evolución</h2>
            <span className="text-sm text-muted">
              {diff >= 0 ? "+" : ""}
              {diff} kg desde el inicio
            </span>
          </div>
          <TrendChart points={ordered} />
        </div>
      )}

      {reversed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink">Registros</h2>
          <ul className="space-y-2">
            {reversed.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-tile bg-white px-4 py-3 text-sm shadow-soft"
              >
                <span className="text-muted">{fmtDate(e.date)}</span>
                <span className="font-medium text-ink">{e.kg} kg</span>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="text-xs text-muted underline"
                  aria-label="Borrar registro"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
