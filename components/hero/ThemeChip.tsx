"use client";

import { useState } from "react";

import { ThemeSheet } from "./ThemeSheet";

// U7 — the way into the theme sheet.
//
// A small chip on the hero card itself rather than a row in `/ajustes`, for the
// reason the sheet is a sheet: the thing being changed is the thing she is
// looking at. It is deliberately quiet — a background chooser competing with
// the baby for attention on the home screen would be the wrong order.

export function ThemeChip({
  ink = "dark",
  className = "",
}: {
  ink?: "dark" | "light";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cambiar el fondo"
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold backdrop-blur-sm transition active:scale-[0.97] ${
          ink === "light"
            ? "bg-white/20 text-white"
            : "bg-white/70 text-petrol"
        } ${className}`}
      >
        <span aria-hidden>✦</span>
        Fondo
      </button>
      <ThemeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
