"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted, softDelete, type JournalEntry } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { decryptNote, encryptNote, isPinSet, isUnlocked, unlock } from "@/lib/crypto";
import { SyncConflicts } from "@/components/SyncConflicts";

// BUILD-PLAN D2 — the diary (feature map #21).
//
// It writes to `journalEntries`, the same store "Síntomas y ánimo" uses, rather
// than to a new one. That is the whole design decision and it is deliberate:
//
//   * a note is a note — two stores would mean two places to look for what she
//     wrote, two things to export, and two things to encrypt;
//   * PIN encryption, soft deletes and sync already work there (A3), and the
//     encrypted-note rule is one nobody should have to re-implement;
//   * the difference between the two screens is the *form*, not the data.
//     Síntomas asks structured questions with checkboxes; the diary offers a
//     blank page and the week it belongs to.
//
// A diary entry is simply a journal row with no mood and no symptoms, which is
// also what makes it show up in the existing history and export untouched.

export default function DiarioPage() {
  const profile = useProfile();
  const week = profile.week ?? 0;

  const [text, setText] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [pinNeeded, setPinNeeded] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (isPinSet() && !isUnlocked()) setPinNeeded(true);
  }, []);

  const entries = useLiveQuery(
    async () =>
      notDeleted(await db().journalEntries.orderBy("createdAt").reverse().toArray()),
    [],
  );

  // Only the free-text entries: this screen is the blank page, not the log.
  const diary = (entries ?? []).filter(
    (entry) => entry.note && entry.symptoms.length === 0 && !entry.mood,
  );

  async function save() {
    const trimmed = text.trim();
    if (!trimmed) return;

    let note = trimmed;
    let noteEncrypted = false;
    if (isPinSet()) {
      if (!isUnlocked()) {
        setPinNeeded(true);
        return;
      }
      note = await encryptNote(trimmed);
      noteEncrypted = true;
    }

    await db().journalEntries.add({
      week,
      symptoms: [],
      note,
      noteEncrypted,
      createdAt: Date.now(),
    });
    setText("");
    setSavedMsg("Guardado.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  async function tryUnlock() {
    if (await unlock(pinInput)) {
      setPinNeeded(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("PIN incorrecto.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Diario</h1>
        {/* K18 — this said "queda en tu teléfono", full stop. Journal entries
            are in SYNCED_STORES (lib/sync/stores.ts): with an account they go
            to the server like every other record, and the only thing that
            stops the server holding readable text is the optional PIN, which
            encrypts the note on the device before it is ever written. That is
            a real and unusually strong guarantee — and it was being buried
            under a sentence that promised something else entirely. */}
        <p className="text-sm text-muted">
          Escribí lo que quieras guardar de estos meses. Con PIN, tus notas se
          cifran en este teléfono y ni nosotros podemos leerlas. Sin PIN, se
          copian a tu cuenta como el resto de tus datos.
        </p>
      </header>

      {/* K18 — A3's conflict surface belongs on BOTH screens that write
          journal notes, not only on Síntomas. `journalEntries` is one store:
          a note written here, replaced by a newer edit from another device, is
          kept as a `conflicts` row — and until now it surfaced on a screen the
          person who wrote it may never open. The one place in the app where
          silent loss would actually hurt was silent for half its writers. */}
      <SyncConflicts />

      {pinNeeded ? (
        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="text-base font-extrabold text-ink">Desbloqueá tu diario</h2>
          <p className="mt-1 text-sm text-muted">
            Tenés un PIN puesto. Sin él no podemos leer ni escribir tus notas.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(event) => setPinInput(event.target.value)}
            className="mt-3 w-full rounded-tile border border-line px-4 py-3 text-sm"
            aria-label="PIN"
          />
          {pinError && <p className="mt-1 text-sm text-terracotta">{pinError}</p>}
          <button
            type="button"
            onClick={() => void tryUnlock()}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Desbloquear
          </button>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-white p-4">
          <label htmlFor="entrada" className="text-base font-extrabold text-ink">
            {week > 0 ? `Semana ${week}` : "Hoy"}
          </label>
          <textarea
            id="entrada"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder="Hoy sentí…"
            className="mt-2 w-full rounded-tile border border-line px-4 py-3 text-sm leading-relaxed text-ink"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={text.trim() === ""}
            className="mt-3 min-h-[48px] w-full rounded-tile bg-terracotta px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            Guardar
          </button>
          {savedMsg && <p className="mt-2 text-sm text-sage">{savedMsg}</p>}
        </section>
      )}

      {diary.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold text-ink">Lo que escribiste</h2>
          {diary.map((entry) => (
            <DiaryEntry key={entry.id} entry={entry} />
          ))}
        </section>
      )}
    </div>
  );
}

function DiaryEntry({ entry }: { entry: JournalEntry }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!entry.noteEncrypted) {
        setText(entry.note);
        return;
      }
      if (!isUnlocked()) {
        setText(null);
        return;
      }
      try {
        const plain = await decryptNote(entry.note);
        if (active) setText(plain);
      } catch {
        if (active) setText(null);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [entry.note, entry.noteEncrypted]);

  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          {entry.week > 0 ? `Semana ${entry.week} · ` : ""}
          {new Date(entry.createdAt).toLocaleDateString("es-PY", {
            day: "numeric",
            month: "long",
          })}
        </p>
        <button
          type="button"
          onClick={() => entry.id && void softDelete("journalEntries", entry.id)}
          className="text-[13px] font-extrabold text-terracotta"
        >
          Borrar
        </button>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {text === null ? "🔒 Desbloqueá con tu PIN para leer esta entrada." : text}
      </p>
    </article>
  );
}
