"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { PRECONCEPTION_ITEMS } from "@/lib/preconception";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";

export default function PreconcepcionPage() {
  const state = useLiveQuery(() => db().checklistState.toArray(), []);
  const done = new Set((state ?? []).filter((s) => s.done).map((s) => s.key));

  async function toggle(key: string) {
    const existing = await db().checklistState.where("key").equals(key).first();
    if (existing?.id) {
      await db().checklistState.update(existing.id, { done: !existing.done });
    } else {
      await db().checklistState.add({ key, done: true });
    }
  }

  const completed = PRECONCEPTION_ITEMS.filter((i) => done.has(i.key)).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Checklist preconcepción
        </h1>
        <p className="text-sm text-muted">
          Pasos con respaldo para llegar al embarazo de la forma más sana. Lo que
          tildes se guarda solo en tu teléfono.
        </p>
      </header>

      <section className="rounded-card bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-extrabold text-ink">Antes de buscar embarazo</h2>
          <span className="text-xs text-muted">
            {completed}/{PRECONCEPTION_ITEMS.length}
          </span>
        </div>
        <ul className="space-y-1">
          {PRECONCEPTION_ITEMS.map((item) => {
            const checked = done.has(item.key);
            return (
              <li key={item.key} className="border-b border-line pb-2 last:border-0">
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  className="flex w-full items-start gap-3 rounded-tile px-2 py-1.5 text-left transition active:bg-black/5"
                  aria-pressed={checked}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                      checked
                        ? "border-petrol bg-petrol text-white"
                        : "border-black/20 bg-white"
                    }`}
                  >
                    {checked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm ${checked ? "text-muted line-through" : "font-medium text-ink"}`}>
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {item.detail}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-cream px-2 py-0.5 text-[10px] text-muted">
                      Fuente: {item.source}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <MedicalReviewByline />
      <p className="text-[11px] leading-relaxed text-muted">
        Contenido informativo, no reemplaza la atención de un profesional de la
        salud. Ante cualquier duda, consultá con tu médico/a.
      </p>
      <PrivacyLine />
    </div>
  );
}
