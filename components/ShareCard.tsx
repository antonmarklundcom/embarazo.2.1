"use client";

import { useState } from "react";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  bumpFrameContent,
  canShareFiles,
  shareFileName,
  shareText,
  weekCardContent,
} from "@/lib/share/card";
import { drawBumpFrame, drawWeekCard } from "@/lib/share/draw";

// BUILD-PLAN E2 — the share button (feature map #30).
//
// Everything happens on the device: the canvas is drawn here, `toBlob` produces
// a file here, and `navigator.share` hands that file to whatever the user picks.
// A bump photo never touches our server — there is no request in this path at
// all, which is a property `share.test.ts` asserts against the source rather
// than trusting a comment.
//
// The fallback matters as much as the happy path. Several browsers expose
// `navigator.share` but refuse files, and a share that silently does nothing is
// worse than a download: when files cannot be shared, the image is offered as a
// normal download instead.

async function toFile(
  draw: (ctx: CanvasRenderingContext2D) => void,
  name: string,
): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  draw(ctx);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/png"),
  );
  return blob ? new File([blob], name, { type: "image/png" }) : null;
}

export function ShareCard({
  week,
  photo,
  label = "Compartir",
  className = "",
}: {
  week: number;
  /** A bump photo to composite. Without one, the plain week card is shared. */
  photo?: Blob;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function share() {
    setBusy(true);
    setError("");
    try {
      const kind = photo ? "panza" : "semana";
      const name = shareFileName(week, kind);

      let file: File | null;
      if (photo) {
        const bitmap = await createImageBitmap(photo);
        file = await toFile(
          (ctx) => drawBumpFrame(ctx, bumpFrameContent(week), bitmap),
          name,
        );
        bitmap.close();
      } else {
        file = await toFile((ctx) => drawWeekCard(ctx, weekCardContent(week)), name);
      }

      if (!file) {
        setError("No pudimos armar la imagen. Probá de nuevo.");
        return;
      }

      if (canShareFiles(navigator, file)) {
        await navigator.share({ files: [file], text: shareText(week) });
        return;
      }

      // No file sharing here: hand it over as a download rather than pretend.
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      // A user who dismisses the share sheet is not an error worth showing.
      if ((cause as { name?: string })?.name !== "AbortError") {
        setError("No pudimos compartir la imagen.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className="min-h-[44px] w-full rounded-tile bg-pastel-lavanda px-4 text-sm font-extrabold text-ink transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Preparando…" : label}
      </button>
      {error && <p className="mt-1 text-sm text-terracotta">{error}</p>}
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        La imagen se arma en tu teléfono y solo lleva la semana. La foto no sale
        de acá hasta que vos elegís con quién compartirla.
      </p>
    </div>
  );
}
