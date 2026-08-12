"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, notDeleted, type JournalEntry, type Mood } from "@/lib/db";
import {
  getCurrentWeek,
  getCompletedGestation,
  formatCompletedGestation,
} from "@/lib/pregnancy";
import { departmentName } from "@/lib/departments";
import {
  isPinSet,
  isUnlocked,
  unlock,
  decryptNote,
} from "@/lib/crypto";
import { PrivacyLine } from "@/components/PrivacyLine";

const MOOD_LABELS: Record<Mood, string> = {
  muy_bien: "Muy bien",
  bien: "Bien",
  regular: "Regular",
  mal: "Mal",
  muy_mal: "Muy mal",
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResumenPage() {
  const [generatedAt] = useState(() => Date.now());
  const [pinNeeded, setPinNeeded] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlockedNonce, setUnlockedNonce] = useState(0);

  useEffect(() => {
    if (isPinSet() && !isUnlocked()) setPinNeeded(true);
  }, []);

  const data = useLiveQuery(async () => {
    // Every read here is filtered through notDeleted: since A3 these stores
    // are soft-deleted, and a tombstone must never reach the summary a user
    // hands to their obstetra.
    const profile = notDeleted(await db().profile.toArray())[0] ?? null;
    const pregnancy = notDeleted(await db().pregnancy.toArray())[0] ?? null;
    const weights = notDeleted(
      await db().weightEntries.orderBy("date").toArray(),
    );
    const journal = notDeleted(
      await db().journalEntries.orderBy("createdAt").toArray(),
    );
    const kicks = notDeleted(
      await db().kickSessions.orderBy("startedAt").toArray(),
    );
    const contractions = notDeleted(
      await db().contractionEntries.orderBy("startedAt").toArray(),
    );
    return { profile, pregnancy, weights, journal, kicks, contractions };
  }, []);

  const symptomCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of data?.journal ?? [])
      for (const s of e.symptoms) c.set(s, (c.get(s) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [data?.journal]);

  const moodCounts = useMemo(() => {
    const c = new Map<Mood, number>();
    for (const e of data?.journal ?? [])
      if (e.mood) c.set(e.mood, (c.get(e.mood) ?? 0) + 1);
    return c;
  }, [data?.journal]);

  async function tryUnlock() {
    const ok = await unlock(pinInput);
    if (ok) {
      setPinNeeded(false);
      setPinInput("");
      setPinError("");
      setUnlockedNonce((n) => n + 1);
    } else {
      setPinError("PIN incorrecto.");
    }
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-tile bg-black/5" />
        <div className="h-40 animate-pulse rounded-card bg-black/5" />
      </div>
    );
  }

  const { profile, pregnancy, weights, journal, kicks, contractions } = data;
  const lmp = pregnancy?.lmpDate;
  const week = lmp !== undefined ? getCurrentWeek(lmp) : undefined;
  const completed =
    lmp !== undefined ? formatCompletedGestation(getCompletedGestation(lmp)) : undefined;

  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const weightDiff =
    firstWeight && lastWeight
      ? Math.round((lastWeight.kg - firstWeight.kg) * 10) / 10
      : null;

  const notesWithText = journal.filter((e) => e.note);

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Action bar (not printed) */}
      <div className="no-print flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Resumen para mi control
        </h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="no-print rounded-card border border-sage/30 bg-sage/5 p-4">
        <PrivacyLine />
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Este resumen organiza tus datos para que se los muestres a tu médico/a.
          Queda solo en tu teléfono y solo se comparte cuando vos lo mostrás o
          imprimís. No es un diagnóstico.
        </p>
      </div>

      {/* PIN prompt to include encrypted notes */}
      {pinNeeded && (
        <section className="no-print rounded-card border border-sage/30 bg-sage/5 p-4">
          <p className="text-sm text-ink">
            Tenés notas cifradas. Ingresá tu PIN para incluirlas en el resumen.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
            placeholder="PIN"
            className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 focus:border-petrol focus:outline-none"
          />
          <button
            type="button"
            onClick={tryUnlock}
            className="mt-2 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white"
          >
            Desbloquear
          </button>
          {pinError && <p className="mt-2 text-sm text-terracotta">{pinError}</p>}
        </section>
      )}

      {/* ===== Printable report ===== */}
      <article className="space-y-5 rounded-card bg-white p-5 shadow-soft print:rounded-none print:p-0 print:shadow-none">
        <header className="border-b border-black/10 pb-3">
          <h2 className="text-lg font-black text-ink">
            Resumen para mi control prenatal
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Generado el {fmtDateTime(generatedAt)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Generado por la app — para uso informativo, no reemplaza la
            evaluación médica.
          </p>
        </header>

        {/* Datos del embarazo */}
        <ReportSection title="Datos del embarazo">
          <Field label="FUM (última regla)" value={lmp ? fmtDate(lmp) : "—"} />
          <Field
            label="FPP (fecha probable de parto)"
            value={pregnancy?.dueDate ? fmtDate(pregnancy.dueDate) : "—"}
          />
          <Field
            label="Edad gestacional"
            value={
              week !== undefined
                ? `Semana ${week} · ${completed} (completas)`
                : "—"
            }
          />
          <Field
            label="Departamento"
            value={
              profile?.department
                ? `${departmentName(profile.department)}${profile.city ? ` · ${profile.city}` : ""}`
                : "—"
            }
          />
        </ReportSection>

        {/* Peso */}
        <ReportSection title="Peso registrado">
          {weights.length === 0 ? (
            <Empty />
          ) : (
            <>
              <Field
                label="Tendencia"
                value={
                  weightDiff !== null
                    ? `${firstWeight!.kg} kg → ${lastWeight!.kg} kg (${weightDiff >= 0 ? "+" : ""}${weightDiff} kg)`
                    : `${lastWeight!.kg} kg`
                }
              />
              <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink">
                {weights.map((w) => (
                  <li key={w.id} className="flex justify-between">
                    <span className="text-muted">{fmtDate(w.date)}</span>
                    <span>{w.kg} kg</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ReportSection>

        {/* Síntomas y ánimo */}
        <ReportSection title="Controles registrados (síntomas y ánimo)">
          {journal.length === 0 ? (
            <Empty />
          ) : (
            <>
              <Field label="Registros en total" value={String(journal.length)} />
              {symptomCounts.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-medium text-muted">Síntomas más frecuentes</p>
                  <p className="text-sm text-ink">
                    {symptomCounts
                      .map(([s, n]) => `${s} (${n})`)
                      .join(", ")}
                  </p>
                </div>
              )}
              {moodCounts.size > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-medium text-muted">Ánimo</p>
                  <p className="text-sm text-ink">
                    {[...moodCounts.entries()]
                      .map(([m, n]) => `${MOOD_LABELS[m]} (${n})`)
                      .join(", ")}
                  </p>
                </div>
              )}
            </>
          )}
        </ReportSection>

        {/* Movimientos fetales */}
        <ReportSection title="Movimientos fetales (pataditas)">
          {kicks.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-1 text-sm text-ink">
              {kicks
                .slice()
                .reverse()
                .slice(0, 10)
                .map((k) => (
                  <li key={k.id} className="flex justify-between">
                    <span className="text-muted">{fmtDateTime(k.startedAt)}</span>
                    <span>
                      {k.count} {k.count === 1 ? "movimiento" : "movimientos"}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </ReportSection>

        {/* Contracciones */}
        {contractions.length > 0 && (
          <ReportSection title="Contracciones registradas">
            <Field
              label="Sesiones registradas"
              value={String(contractions.length)}
            />
            <p className="text-xs text-muted">
              Última: {fmtDateTime(contractions[contractions.length - 1]!.startedAt)}
            </p>
          </ReportSection>
        )}

        {/* Notas */}
        {notesWithText.length > 0 && (
          <ReportSection title="Notas">
            <ul className="space-y-2">
              {notesWithText.map((e) => (
                <NoteRow key={`${e.id}-${unlockedNonce}`} entry={e} />
              ))}
            </ul>
          </ReportSection>
        )}

        <footer className="border-t border-black/10 pt-3 text-[11px] leading-relaxed text-muted">
          Generado por la app — para uso informativo, no reemplaza la evaluación
          médica. Este resumen organiza los datos que la persona registró; no
          interpreta resultados ni indica si algo es normal o anormal.
        </footer>
      </article>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1 break-inside-avoid">
      <h3 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-x-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </p>
  );
}

function Empty() {
  return <p className="text-sm text-muted">Sin registros.</p>;
}

function NoteRow({ entry }: { entry: JournalEntry }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!entry.note) return setText("");
      if (entry.noteEncrypted) {
        if (!isUnlocked()) return setText(null);
        try {
          const plain = await decryptNote(entry.note);
          if (active) setText(plain);
        } catch {
          if (active) setText(null);
        }
      } else {
        setText(entry.note);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [entry.note, entry.noteEncrypted]);

  return (
    <li className="text-sm">
      <span className="text-xs text-muted">
        {fmtDate(entry.createdAt)} · Semana {entry.week}
      </span>
      <p className="text-ink">
        {entry.noteEncrypted && text === null
          ? "🔒 Nota cifrada (ingresá tu PIN para incluirla)."
          : text}
      </p>
    </li>
  );
}
