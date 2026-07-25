"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CarnePhoto } from "@/lib/db";
import { downscaleImage } from "@/lib/images";
import { PrivacyLine } from "@/components/PrivacyLine";

const BLOOD_TYPES = ["O+", "O−", "A+", "A−", "B+", "B−", "AB+", "AB−"];

// Digital copy of the paper carné perinatal: photos of its pages + the
// clinical basics that matter in a guardia. Device-only, like everything.
export default function CarnePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<CarnePhoto | null>(null);

  const photos = useLiveQuery(
    () => db().carnePhotos.orderBy("createdAt").toArray(),
    [],
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await downscaleImage(file);
      await db().carnePhotos.add({ blob, createdAt: Date.now() });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id?: number) {
    if (id) await db().carnePhotos.delete(id);
    setViewing(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Carné perinatal
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sacale foto a cada página de tu carné después de cada control. Así
          llevás siempre una copia, aunque el papel se pierda o quede en casa.
        </p>
      </header>

      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <PrivacyLine />
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Las fotos del carné quedan solo en tu teléfono y no se suben nunca.
          Esta copia no reemplaza al carné de papel: llevalo igual a tus
          controles.
        </p>
      </section>

      <ClinicalBasics />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "Guardando…" : "Agregar foto del carné"}
      </button>

      {(photos?.length ?? 0) === 0 ? (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            Todavía no agregaste páginas. Empezá por la tapa y la página de
            datos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos!.map((p, i) => (
            <CarneThumb
              key={p.id}
              photo={p}
              index={i + 1}
              onView={() => setViewing(p)}
            />
          ))}
        </div>
      )}

      {viewing && (
        <CarneViewer
          photo={viewing}
          onClose={() => setViewing(null)}
          onRemove={remove}
        />
      )}
    </div>
  );
}

function ClinicalBasics() {
  const row = useLiveQuery(async () => {
    const rows = await db().clinical.toArray();
    return rows[0] ?? null;
  }, []);
  const [editing, setEditing] = useState(false);
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form state when opening the editor.
  useEffect(() => {
    if (editing) {
      setBloodType(row?.bloodType ?? "");
      setAllergies(row?.allergies ?? "");
      setNotes(row?.notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function save() {
    const value = {
      bloodType: bloodType || undefined,
      allergies: allergies.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (row?.id) {
      await db().clinical.update(row.id, value);
    } else {
      await db().clinical.add(value);
    }
    setEditing(false);
  }

  const hasData = row && (row.bloodType || row.allergies || row.notes);

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-extrabold text-ink">Tus datos clave</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-petrol underline"
          >
            {hasData ? "Editar" : "Completar"}
          </button>
        )}
      </div>
      {!editing && hasData && (
        <dl className="mt-2 space-y-1 text-sm text-ink/90">
          {row.bloodType && (
            <div className="flex gap-2">
              <dt className="text-muted">Grupo sanguíneo:</dt>
              <dd className="font-medium">{row.bloodType}</dd>
            </div>
          )}
          {row.allergies && (
            <div className="flex gap-2">
              <dt className="text-muted">Alergias:</dt>
              <dd>{row.allergies}</dd>
            </div>
          )}
          {row.notes && (
            <div className="flex gap-2">
              <dt className="text-muted">Notas:</dt>
              <dd>{row.notes}</dd>
            </div>
          )}
        </dl>
      )}
      {!editing && !hasData && (
        <p className="mt-1 text-sm text-muted">
          Grupo sanguíneo, alergias y lo que la guardia debería saber de vos.
        </p>
      )}
      {editing && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">
              Grupo sanguíneo
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBloodType(bloodType === t ? "" : t)}
                  aria-pressed={bloodType === t}
                  className={`min-h-[36px] rounded-full px-3 text-sm transition ${
                    bloodType === t
                      ? "bg-petrol text-white"
                      : "bg-black/5 text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Alergias (ej. penicilina)"
            className="w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (enfermedades, medicación actual…)"
            rows={2}
            className="w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-tile bg-petrol py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-tile px-4 py-2.5 text-sm text-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function useBlobUrl(blob: Blob): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function CarneThumb({
  photo,
  index,
  onView,
}: {
  photo: CarnePhoto;
  index: number;
  onView: () => void;
}) {
  const url = useBlobUrl(photo.blob);
  return (
    <button
      type="button"
      onClick={onView}
      className="relative aspect-square overflow-hidden rounded-tile bg-black/5"
      aria-label={`Ver página ${index} del carné`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 text-[10px] text-white">
        {index}
      </span>
    </button>
  );
}

function CarneViewer({
  photo,
  onClose,
  onRemove,
}: {
  photo: CarnePhoto;
  onClose: () => void;
  onRemove: (id?: number) => void;
}) {
  const url = useBlobUrl(photo.blob);
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-end text-white">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-3 text-sm"
          aria-label="Cerrar"
        >
          Cerrar
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL from IndexedDB, next/image can't optimize it.
          <img
            src={url}
            alt="Página del carné perinatal"
            className="max-h-full max-w-full rounded-card object-contain"
          />
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(photo.id);
        }}
        className="mx-auto mt-2 min-h-[44px] rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-terracotta"
      >
        Borrar esta foto
      </button>
    </div>
  );
}
