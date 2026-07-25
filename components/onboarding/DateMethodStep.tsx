"use client";

import { useState } from "react";
import {
  DUE_DATE_METHODS,
  DUE_DATE_METHOD_HINTS,
  DUE_DATE_METHOD_LABELS,
  type DueDateInput,
  type DueDateMethod,
  type EmbryoDay,
} from "@/lib/dueDate";

// BUILD-PLAN B3 / FEATURE-MAP #4. The date step, with every entry method.
//
// Ultrasound dating is not a special case here — it is one of five equals, and
// in Paraguay it is often the ONLY thing a woman knows ("me dijeron que tengo
// 12 semanas y 3 días"). Forcing her to convert that into a last-period date
// in her head is how other apps lose people on the first screen.

export interface DateMethodValue {
  method: DueDateMethod;
  lmp: string;
  dueDate: string;
  scanDate: string;
  weeksAtScan: string;
  daysAtScan: string;
  transferDate: string;
  embryoDay: EmbryoDay;
  conceptionDate: string;
}

export const EMPTY_DATE_VALUE: DateMethodValue = {
  method: "lmp",
  lmp: "",
  dueDate: "",
  scanDate: "",
  weeksAtScan: "",
  daysAtScan: "0",
  transferDate: "",
  embryoDay: 5,
  conceptionDate: "",
};

function dateMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Converts the form state into a `DueDateInput`, or null when incomplete.
 * Exported so the parent can validate before advancing.
 */
export function toDueDateInput(v: DateMethodValue): DueDateInput | null {
  switch (v.method) {
    case "lmp": {
      const lmpDate = dateMs(v.lmp);
      return lmpDate === null ? null : { method: "lmp", lmpDate };
    }
    case "dueDate": {
      const dueDate = dateMs(v.dueDate);
      return dueDate === null ? null : { method: "dueDate", dueDate };
    }
    case "ultrasound": {
      const scanDate = dateMs(v.scanDate);
      const weeks = Number(v.weeksAtScan);
      const days = Number(v.daysAtScan);
      if (scanDate === null || v.weeksAtScan === "") return null;
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 42) return null;
      if (!Number.isInteger(days) || days < 0 || days > 6) return null;
      return {
        method: "ultrasound",
        scanDate,
        weeksAtScan: weeks,
        daysAtScan: days,
      };
    }
    case "ivf": {
      const transferDate = dateMs(v.transferDate);
      return transferDate === null
        ? null
        : { method: "ivf", transferDate, embryoDay: v.embryoDay };
    }
    case "conception": {
      const conceptionDate = dateMs(v.conceptionDate);
      return conceptionDate === null
        ? null
        : { method: "conception", conceptionDate };
    }
  }
}

const inputClass =
  "mt-2 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none";
const labelClass = "block text-sm font-extrabold text-ink";

export function DateMethodFields({
  value,
  onChange,
}: {
  value: DateMethodValue;
  onChange: (next: DateMethodValue) => void;
}) {
  const [showMethods, setShowMethods] = useState(false);
  const set = (patch: Partial<DateMethodValue>) =>
    onChange({ ...value, ...patch });

  const today = new Date().toISOString().slice(0, 10);
  const earliest = new Date(Date.now() - 300 * 86400000)
    .toISOString()
    .slice(0, 10);

  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        {DUE_DATE_METHOD_LABELS[value.method]}
      </p>
      <p className="mt-1 text-xs text-muted">
        {DUE_DATE_METHOD_HINTS[value.method]}
      </p>

      <div className="mt-3">
        {value.method === "lmp" && (
          <>
            <label htmlFor="lmp" className={labelClass}>
              ¿Cuándo fue el primer día de tu última menstruación?
            </label>
            <input
              id="lmp"
              type="date"
              value={value.lmp}
              min={earliest}
              max={today}
              onChange={(e) => set({ lmp: e.target.value })}
              className={inputClass}
            />
          </>
        )}

        {value.method === "dueDate" && (
          <>
            <label htmlFor="due" className={labelClass}>
              ¿Cuál es tu fecha probable de parto?
            </label>
            <input
              id="due"
              type="date"
              value={value.dueDate}
              onChange={(e) => set({ dueDate: e.target.value })}
              className={inputClass}
            />
          </>
        )}

        {value.method === "ultrasound" && (
          <>
            <label htmlFor="scan" className={labelClass}>
              ¿Qué día te hiciste la ecografía?
            </label>
            <input
              id="scan"
              type="date"
              value={value.scanDate}
              min={earliest}
              max={today}
              onChange={(e) => set({ scanDate: e.target.value })}
              className={inputClass}
            />

            <p className={`${labelClass} mt-4`}>
              ¿Cuánto te dijeron que tenías ese día?
            </p>
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <label htmlFor="scanWeeks" className="text-xs text-muted">
                  Semanas
                </label>
                <input
                  id="scanWeeks"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={42}
                  value={value.weeksAtScan}
                  onChange={(e) => set({ weeksAtScan: e.target.value })}
                  className="min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="scanDays" className="text-xs text-muted">
                  Días
                </label>
                <select
                  id="scanDays"
                  value={value.daysAtScan}
                  onChange={(e) => set({ daysAtScan: e.target.value })}
                  className="min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={String(d)}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {value.method === "ivf" && (
          <>
            <label htmlFor="transfer" className={labelClass}>
              ¿Qué día fue la transferencia?
            </label>
            <input
              id="transfer"
              type="date"
              value={value.transferDate}
              min={earliest}
              max={today}
              onChange={(e) => set({ transferDate: e.target.value })}
              className={inputClass}
            />

            <p className={`${labelClass} mt-4`}>¿De cuántos días era el embrión?</p>
            <div className="mt-2 flex gap-2">
              {([3, 5] as EmbryoDay[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ embryoDay: d })}
                  className={`min-h-[44px] flex-1 rounded-full border text-sm font-extrabold transition ${
                    value.embryoDay === d
                      ? "border-terracotta bg-terracotta text-white"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  Día {d}
                </button>
              ))}
            </div>
          </>
        )}

        {value.method === "conception" && (
          <>
            <label htmlFor="conception" className={labelClass}>
              ¿Qué día fue la concepción?
            </label>
            <input
              id="conception"
              type="date"
              value={value.conceptionDate}
              min={earliest}
              max={today}
              onChange={(e) => set({ conceptionDate: e.target.value })}
              className={inputClass}
            />
          </>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowMethods((v) => !v)}
          className="min-h-[44px] text-sm font-extrabold text-petrol"
          aria-expanded={showMethods}
        >
          {showMethods ? "Cerrar" : "Calcular de otra forma"}
        </button>

        {showMethods && (
          <div className="mt-1 space-y-2">
            {DUE_DATE_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  set({ method: m });
                  setShowMethods(false);
                }}
                className={`block w-full rounded-tile border p-3 text-left transition ${
                  value.method === m
                    ? "border-terracotta bg-terracotta/5"
                    : "border-line bg-white"
                }`}
              >
                <span className="block text-sm font-extrabold text-ink">
                  {DUE_DATE_METHOD_LABELS[m]}
                </span>
                <span className="block text-xs text-muted">
                  {DUE_DATE_METHOD_HINTS[m]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
