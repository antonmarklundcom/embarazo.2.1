"use client";

import { useEffect, useRef, useState } from "react";

import {
  AI_BABY_CONSENT_POINTS,
  AI_BABY_LABEL,
  MAX_PHOTO_BYTES,
  PHOTO_PROBLEM_MESSAGE,
  validatePhotos,
  type GeneratedImage,
  type ParentPhoto,
} from "@/lib/ai/babyImage";
import { downscaleImage } from "@/lib/images";
import { db } from "@/lib/db";

// BUILD-PLAN F1 — "así podría ser tu bebé".
//
// The consent step is a gate, not a paragraph: the button that sends anything
// does not exist until the box is ticked, and the server refuses a request
// without the matching field. It names what is sent, to whom, and that it is
// not kept — ARCHITECTURE.md §10.
//
// The result lives in this component's state until the user presses "Guardar".
// Closing the screen without saving means it exists nowhere: not on our
// server, not on the phone.

async function fileToPhoto(file: File): Promise<ParentPhoto | null> {
  try {
    // Reuse the carné/bump downscaler: a 12 MP phone photo is both a slow
    // upload on mobile data and more of somebody's face than the model needs.
    const blob = await downscaleImage(file);
    const buffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return { mimeType: blob.type || "image/jpeg", data: btoa(binary) };
  } catch {
    return null;
  }
}

export default function BebeIaPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [consented, setConsented] = useState(false);
  const [photos, setPhotos] = useState<ParentPhoto[]>([]);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // One HEAD-ish probe: with AI_BABY_ENABLED unset the route 404s and this
    // screen says so instead of offering a button that cannot work.
    void fetch("/api/v1/ai/baby", { method: "POST", body: "{}" })
      .then((res) => setAvailable(res.status !== 404))
      .catch(() => setAvailable(false));
  }, []);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = [...(event.target.files ?? [])].slice(0, 2);
    const converted: ParentPhoto[] = [];
    for (const file of files) {
      const photo = await fileToPhoto(file);
      if (photo) converted.push(photo);
    }
    const problem = validatePhotos(converted);
    if (problem) {
      setError(PHOTO_PROBLEM_MESSAGE[problem]);
      return;
    }
    setPhotos(converted);
  }

  async function generate() {
    setBusy(true);
    setError("");
    setImage(null);
    setSaved(false);
    try {
      const res = await fetch("/api/v1/ai/baby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: "acepto", photos }),
      });
      const body = (await res.json()) as {
        image?: GeneratedImage;
        error?: string;
      };
      if (!res.ok || !body.image) {
        setError(body.error ?? "No pudimos generar la imagen.");
      } else {
        setImage(body.image);
      }
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    } finally {
      setBusy(false);
      // The photos have served their purpose. Dropping them here means a
      // second tap re-picks them rather than silently re-sending a face.
      setPhotos([]);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    if (!image) return;
    const res = await fetch(`data:${image.mimeType};base64,${image.data}`);
    const blob = await res.blob();
    // Saved into the belly-photo diary, which never syncs (§4.4). A generated
    // picture of a baby is exactly as private as a bump photo.
    await db().photoEntries.add({ week: 0, blob, createdAt: Date.now() });
    setSaved(true);
  }

  if (available === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Así podría ser tu bebé
        </h1>
        <p className="text-sm text-muted">
          Esta función no está disponible ahora mismo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Así podría ser tu bebé
        </h1>
        <p className="text-sm text-muted">{AI_BABY_LABEL}</p>
      </header>

      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Antes de subir las fotos
        </h2>
        <ul className="mt-2 space-y-2">
          {AI_BABY_CONSENT_POINTS.map((point) => (
            <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span aria-hidden className="text-petrol">
                •
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <label className="mt-4 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-petrol"
          />
          <span>
            Entiendo y acepto enviar estas fotos para generar la imagen.
          </span>
        </label>
      </section>

      {/* Nothing that sends a photo exists until the box is ticked. */}
      {consented && (
        <section className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Las fotos</h2>
          <p className="mt-1 text-sm text-muted">
            Una o dos fotos de frente, con buena luz. Máximo{" "}
            {Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB cada una.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => void onPick(e)}
            className="mt-3 block w-full text-sm"
          />
          {photos.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {photos.length === 1 ? "1 foto lista" : `${photos.length} fotos listas`}.
            </p>
          )}
          <button
            type="button"
            disabled={busy || photos.length === 0}
            onClick={() => void generate()}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-terracotta px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "Generando…" : "Generar la imagen"}
          </button>
          {error && <p className="mt-2 text-sm text-terracotta">{error}</p>}
        </section>
      )}

      {image && (
        <section className="rounded-card bg-white p-4 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt="Imagen generada por inteligencia artificial"
            className="w-full rounded-tile"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {AI_BABY_LABEL}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saved}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {saved ? "Guardada en tu teléfono" : "Guardar en mi teléfono"}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Si salís sin guardar, la imagen no queda en ningún lado — ni acá ni
            en nuestro servidor.
          </p>
        </section>
      )}
    </div>
  );
}
