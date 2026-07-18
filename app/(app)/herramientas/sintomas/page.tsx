"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type JournalEntry, type Mood } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import {
  isPinSet,
  isUnlocked,
  unlock,
  encryptNote,
  decryptNote,
} from "@/lib/crypto";
import { PrivacyLine } from "@/components/PrivacyLine";

const MOODS: { key: Mood; label: string; emoji: string }[] = [
  { key: "muy_bien", label: "Muy bien", emoji: "😄" },
  { key: "bien", label: "Bien", emoji: "🙂" },
  { key: "regular", label: "Regular", emoji: "😐" },
  { key: "mal", label: "Mal", emoji: "🙁" },
  { key: "muy_mal", label: "Muy mal", emoji: "😣" },
];

const SYMPTOMS = [
  "Náuseas",
  "Acidez",
  "Dolor de espalda",
  "Hinchazón",
  "Contracciones",
  "Antojos",
  "Insomnio",
  "Cansancio",
  "Otros",
];

function moodLabel(key?: Mood): string {
  return MOODS.find((m) => m.key === key)?.label ?? "—";
}
function moodEmoji(key?: Mood): string {
  return MOODS.find((m) => m.key === key)?.emoji ?? "•";
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function SintomasPage() {
  const profile = useProfile();
  const week = profile.week ?? 1;

  const [mood, setMood] = useState<Mood | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // PIN unlock state (notes are encrypted at rest when a PIN is set).
  const [pinNeeded, setPinNeeded] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (isPinSet() && !isUnlocked()) setPinNeeded(true);
  }, []);

  const entries = useLiveQuery(
    () => db().journalEntries.orderBy("createdAt").reverse().toArray(),
    [],
  );

  function toggleSymptom(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function tryUnlock() {
    const ok = await unlock(pinInput);
    if (ok) {
      setPinNeeded(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("PIN incorrecto.");
    }
  }

  async function save() {
    if (!mood && selected.length === 0 && !note.trim()) return;
    const trimmed = note.trim();
    let storedNote = trimmed;
    let noteEncrypted = false;
    if (trimmed && isPinSet()) {
      if (!isUnlocked()) {
        setPinNeeded(true);
        return;
      }
      storedNote = await encryptNote(trimmed);
      noteEncrypted = true;
    }
    await db().journalEntries.add({
      week,
      mood: mood ?? undefined,
      symptoms: selected,
      note: storedNote,
      noteEncrypted,
      createdAt: Date.now(),
    });
    setMood(null);
    setSelected([]);
    setNote("");
    setSavedMsg("Guardado en tu teléfono.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  async function remove(id?: number) {
    if (id) await db().journalEntries.delete(id);
  }

  const list = entries ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          ¿Cómo te sentís hoy?
        </h1>
        <p className="text-sm text-muted">
          Registrá tu ánimo y tus síntomas. Queda solo en tu teléfono.
        </p>
      </header>

      {/* New entry */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <p className="text-sm font-extrabold text-ink">Tu ánimo</p>
        <div className="mt-2 flex justify-between gap-1">
          {MOODS.map((m) => {
            const active = mood === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMood(active ? null : m.key)}
                aria-pressed={active}
                className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-tile border px-1 py-2 text-[11px] transition ${
                  active
                    ? "border-petrol bg-petrol/5 text-petrol"
                    : "border-black/10 text-muted"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                {m.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm font-extrabold text-ink">Síntomas de hoy</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => {
            const active = selected.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                aria-pressed={active}
                className={`min-h-[40px] rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-petrol bg-petrol text-white"
                    : "border-black/10 bg-cream text-ink"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <label htmlFor="note" className="mt-4 block text-sm font-extrabold text-ink">
          Nota <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="¿Algo que quieras recordar de hoy?"
          className="mt-2 w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-sm focus:border-petrol focus:outline-none"
        />
        {isPinSet() && (
          <p className="mt-1 text-[11px] text-muted">
            🔒 Tu nota se guarda cifrada con tu PIN.
          </p>
        )}

        <button
          type="button"
          onClick={save}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Guardar registro · Semana {week}
        </button>
        {savedMsg && <p className="mt-2 text-sm text-sage">{savedMsg}</p>}
      </section>

      {/* PIN unlock prompt */}
      {pinNeeded && (
        <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
          <p className="text-sm text-ink">
            Ingresá tu PIN para ver y guardar notas cifradas.
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

      {/* Summary + history */}
      {list.length > 0 && <MoodSummary entries={list} />}

      {list.length > 0 && (
        <HistoryByWeek entries={list} onRemove={remove} />
      )}

      <PrivacyLine />
    </div>
  );
}

function MoodSummary({ entries }: { entries: JournalEntry[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) if (e.mood) c[e.mood] = (c[e.mood] ?? 0) + 1;
    return c;
  }, [entries]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-sm font-extrabold text-ink">Resumen de tu ánimo</h2>
      <p className="mt-0.5 text-xs text-muted">
        {total} {total === 1 ? "registro" : "registros"} en total.
      </p>
      <ul className="mt-3 space-y-2">
        {MOODS.filter((m) => counts[m.key]).map((m) => {
          const n = counts[m.key] ?? 0;
          const pct = Math.round((n / total) * 100);
          return (
            <li key={m.key} className="flex items-center gap-2">
              <span className="w-7 text-lg">{m.emoji}</span>
              <span className="w-20 shrink-0 text-xs text-muted">{m.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                <span
                  className="block h-full rounded-full bg-sage"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-7 text-right text-xs text-muted">{n}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HistoryByWeek({
  entries,
  onRemove,
}: {
  entries: JournalEntry[];
  onRemove: (id?: number) => void;
}) {
  // Group by week, preserving the newest-first order from the query.
  const groups = useMemo(() => {
    const map = new Map<number, JournalEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.week) ?? [];
      arr.push(e);
      map.set(e.week, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [entries]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-extrabold text-ink">Tu historial</h2>
      {groups.map(([week, items]) => (
        <div key={week} className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-muted">
            Semana {week}
          </p>
          {items.map((e) => (
            <EntryCard key={e.id} entry={e} onRemove={onRemove} />
          ))}
        </div>
      ))}
    </section>
  );
}

function EntryCard({
  entry,
  onRemove,
}: {
  entry: JournalEntry;
  onRemove: (id?: number) => void;
}) {
  const [noteText, setNoteText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!entry.note) {
        setNoteText("");
        return;
      }
      if (entry.noteEncrypted) {
        if (!isUnlocked()) {
          setNoteText(null);
          return;
        }
        try {
          const plain = await decryptNote(entry.note);
          if (active) setNoteText(plain);
        } catch {
          if (active) setNoteText(null);
        }
      } else {
        setNoteText(entry.note);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [entry.note, entry.noteEncrypted]);

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{moodEmoji(entry.mood)}</span>
          <div>
            <p className="text-sm font-extrabold text-ink">
              {moodLabel(entry.mood)}
            </p>
            <p className="text-xs text-muted">{fmtDate(entry.createdAt)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="text-xs text-muted underline"
          aria-label="Borrar registro"
        >
          Borrar
        </button>
      </div>
      {entry.symptoms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.symptoms.map((s) => (
            <span
              key={s}
              className="rounded-full bg-cream px-2.5 py-0.5 text-xs text-ink"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {entry.note && (
        <p className="mt-2 text-sm text-muted">
          {entry.noteEncrypted && noteText === null
            ? "🔒 Nota protegida — ingresá tu PIN para verla."
            : noteText}
        </p>
      )}
    </article>
  );
}
