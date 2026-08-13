"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted, softDelete } from "@/lib/db";
import {
  MAX_QUALITY,
  MIN_QUALITY,
  QUALITY_LABELS,
  SLEEP_REASONS,
  formatSleep,
  nightKey,
  summarise,
} from "@/lib/tools/sleep";

// BUILD-PLAN D2 — sleep log (feature map #21).
//
// Not a sleep tracker: no microphone, no accelerometer, no score. She knows how
// badly she slept. What she does not have is the seven-night picture to show at
// her next control, which is where "no duermo" becomes a conversation about
// acidez, calambres or ansiedad — all of which have answers.

const HOUR_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

export default function SuenoPage() {
  const [hours, setHours] = useState(7);
  const [halfHour, setHalfHour] = useState(false);
  const [quality, setQuality] = useState(3);
  const [reasons, setReasons] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const nights = useLiveQuery(
    async () =>
      notDeleted(await db().sleepEntries.orderBy("date").reverse().toArray()),
    [],
  );

  const lastSeven = (nights ?? []).slice(0, 7);
  const summary = summarise(lastSeven);
  const today = nightKey(new Date());
  const alreadyLogged = (nights ?? []).some((night) => night.date === today);

  async function save() {
    const minutes = hours * 60 + (halfHour ? 30 : 0);
    // One row per night: logging twice corrects the night, it does not add one.
    const existing = (nights ?? []).find((night) => night.date === today);
    if (existing?.id) {
      await db().sleepEntries.update(existing.id, { minutes, quality, reasons });
    } else {
      await db().sleepEntries.add({ date: today, minutes, quality, reasons });
    }
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Sueño</h1>
        <p className="text-sm text-muted">
          Anotá cómo dormiste. En una semana vas a tener algo concreto para
          mostrar en tu control.
        </p>
      </header>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">
          {alreadyLogged ? "Corregí la noche de hoy" : "¿Cuánto dormiste anoche?"}
        </h2>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {HOUR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setHours(option);
                setSaved(false);
              }}
              aria-pressed={hours === option}
              className={`min-h-[44px] w-12 shrink-0 rounded-tile text-sm font-extrabold transition ${
                hours === option ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-muted"
              }`}
            >
              {option} h
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={halfHour}
            onChange={(event) => {
              setHalfHour(event.target.checked);
              setSaved(false);
            }}
            className="h-5 w-5 accent-petrol"
          />
          y media
        </label>

        <h3 className="mt-4 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          ¿Cómo dormiste?
        </h3>
        <div className="mt-2 flex gap-2">
          {Array.from({ length: MAX_QUALITY - MIN_QUALITY + 1 }, (_, i) => i + MIN_QUALITY).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuality(value);
                  setSaved(false);
                }}
                aria-pressed={quality === value}
                aria-label={QUALITY_LABELS[value]}
                className={`min-h-[44px] flex-1 rounded-tile text-[12px] font-extrabold transition ${
                  quality === value
                    ? "bg-pastel-celeste text-ink"
                    : "bg-pastel-arena/50 text-muted"
                }`}
              >
                {QUALITY_LABELS[value]}
              </button>
            ),
          )}
        </div>

        <h3 className="mt-4 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          ¿Qué te despertó?
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {SLEEP_REASONS.map((reason) => {
            const active = reasons.includes(reason);
            return (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  setReasons((current) =>
                    active ? current.filter((r) => r !== reason) : [...current, reason],
                  );
                  setSaved(false);
                }}
                aria-pressed={active}
                className={`min-h-[36px] rounded-tile px-3 text-[13px] font-semibold transition ${
                  active ? "bg-pastel-rosa text-ink" : "bg-pastel-arena/50 text-muted"
                }`}
              >
                {reason}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void save()}
          className="mt-4 min-h-[48px] w-full rounded-tile bg-petrol px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          {saved ? "Guardado" : "Guardar"}
        </button>
      </section>

      {summary.nights > 0 && (
        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Últimas {summary.nights} {summary.nights === 1 ? "noche" : "noches"}
          </h2>
          <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
            Dormiste {formatSleep(summary.averageMinutes)} por noche en promedio, con
            una calidad de {summary.averageQuality} sobre {MAX_QUALITY}.
          </p>
          {summary.topReason && (
            <p className="mt-1 text-sm text-muted">
              Lo que más te despertó: {summary.topReason.toLowerCase()}.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Dormir mal en el embarazo es común y casi siempre tiene una causa
            tratable. Mostrá esto en tu próximo control.
          </p>
        </section>
      )}

      {(nights ?? []).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-ink">Registro</h2>
          <ul className="overflow-hidden rounded-card border border-line bg-white">
            {(nights ?? []).slice(0, 14).map((night) => (
              <li
                key={night.id}
                className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-bold text-ink">
                    {new Date(night.date).toLocaleDateString("es-PY", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-xs text-muted">
                    {formatSleep(night.minutes)} · {QUALITY_LABELS[night.quality]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => night.id && void softDelete("sleepEntries", night.id)}
                  className="text-[13px] font-extrabold text-terracotta"
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
