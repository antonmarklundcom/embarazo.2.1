"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PhotoEntry } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { downscaleImage } from "@/lib/images";
import { PrivacyLine } from "@/components/PrivacyLine";
import { ShareCard } from "@/components/ShareCard";

export default function FotosPage() {
  const profile = useProfile();
  const week = profile.week ?? 1;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<PhotoEntry | null>(null);

  const photos = useLiveQuery(
    () => db().photoEntries.orderBy("week").toArray(),
    [],
  );

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await downscaleImage(file);
      await db().photoEntries.add({ week, blob, createdAt: Date.now() });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id?: number) {
    if (id) await db().photoEntries.delete(id);
    setViewing(null);
  }

  // Group photos by week (ascending) for the grid.
  const groups = useMemo(() => {
    const map = new Map<number, PhotoEntry[]>();
    for (const p of photos ?? []) {
      const arr = map.get(p.week) ?? [];
      arr.push(p);
      map.set(p.week, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [photos]);

  const isEmpty = (photos?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Diario de fotos
        </h1>
        <p className="text-sm text-muted">
          Seguí el crecimiento de tu panza semana a semana.
        </p>
      </header>

      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <PrivacyLine />
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Tus fotos quedan solo en tu teléfono. Nunca se suben a internet.
        </p>
      </section>

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
        {busy ? "Guardando…" : `Agregar foto · Semana ${week}`}
      </button>

      {isEmpty && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            Todavía no agregaste fotos. Sacá la primera para empezar tu diario.
          </p>
        </div>
      )}

      {groups.map(([w, items]) => (
        <section key={w} className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-muted">
            Semana {w}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {items.map((p) => (
              <PhotoThumb key={p.id} photo={p} onView={() => setViewing(p)} />
            ))}
          </div>
        </section>
      ))}

      {viewing && (
        <PhotoViewer photo={viewing} onClose={() => setViewing(null)} onRemove={remove} />
      )}
    </div>
  );
}

function usePhotoUrl(blob: Blob): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function PhotoThumb({
  photo,
  onView,
}: {
  photo: PhotoEntry;
  onView: () => void;
}) {
  const url = usePhotoUrl(photo.blob);
  return (
    <button
      type="button"
      onClick={onView}
      className="aspect-square overflow-hidden rounded-tile bg-black/5"
      aria-label={`Ver foto de la semana ${photo.week}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  );
}

function PhotoViewer({
  photo,
  onClose,
  onRemove,
}: {
  photo: PhotoEntry;
  onClose: () => void;
  onRemove: (id?: number) => void;
}) {
  const url = usePhotoUrl(photo.blob);
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-white">
        <span className="text-sm">Semana {photo.week}</span>
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
            alt={`Foto de la semana ${photo.week}`}
            className="max-h-full max-w-full rounded-card object-contain"
          />
        )}
      </div>
      {/* E2: the bump frame. Composited on this device, from this blob — the
          photo has no path to our server, here or anywhere. */}
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <ShareCard
          week={photo.week}
          photo={photo.blob}
          label="Compartir con marco"
        />
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
