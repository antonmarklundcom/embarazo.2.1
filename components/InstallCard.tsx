"use client";

import { useState } from "react";
import Image from "next/image";
import { APP_NAME } from "@/lib/brand";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import type { InstallDevice } from "@/lib/installDevice";

export function InstallCard() {
  const { canPromptInstall, promptInstall, isStandalone, device } = useInstallPrompt();
  const [choice, setChoice] = useState<InstallDevice | null>(null);
  const [message, setMessage] = useState("");
  if (isStandalone || !device) return null;
  const selected = choice ?? device;

  return (
    <section aria-label={`Instalar ${APP_NAME}`} className="rounded-card border border-line bg-white p-4">
      <h3 className="text-base font-extrabold text-ink">Agregá {APP_NAME} a tu pantalla de inicio</h3>
      <p className="mt-1 text-sm font-semibold text-muted">Sin App Store ni Google Play. Tu cuenta es la misma en todos tus dispositivos.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Elegí tu dispositivo">
        {(["iphone", "android", "desktop"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={selected === option} onClick={() => setChoice(option)}
            className="min-h-11 rounded-full border border-line px-4 text-sm font-bold aria-pressed:bg-petrol aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
            {option === "iphone" ? "iPhone / iPad" : option === "android" ? "Android" : "Computadora"}
          </button>
        ))}
      </div>
      {selected === "desktop" ? (
        <div className="mt-4 text-sm text-ink">
          <p>Escaneá este QR con la cámara de tu teléfono para abrir {APP_NAME}. También podés seguir usando la app en esta computadora.</p>
          <Image src="/install-qr.svg" width={200} height={200} unoptimized alt="Código QR para abrir app.embarazo.com.py" className="mt-3 h-[200px] w-[200px] max-w-full" />
          <a className="break-all font-bold underline" href="https://app.embarazo.com.py/">app.embarazo.com.py</a>
        </div>
      ) : (
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-ink">
          <li>{selected === "iphone" ? "Abrí app.embarazo.com.py en Safari. Si llegaste desde Instagram o WhatsApp, abrí el link en Safari." : "Abrí app.embarazo.com.py en Chrome. Si estás dentro de otra app, abrí el link en tu navegador."}</li>
          <li>{selected === "iphone" ? "Tocá Compartir y elegí Agregar a la pantalla de inicio." : "Abrí el menú ⋮ y elegí Instalar app o Agregar a la pantalla de inicio."}</li>
          <li>{selected === "iphone" ? "Si aparece Abrir como app web, dejalo activado y tocá Agregar." : `Confirmá la instalación y abrí ${APP_NAME} desde su ícono.`}</li>
        </ol>
      )}
      {canPromptInstall && selected === device && (
        <button type="button" onClick={() => void promptInstall().catch(() => setMessage("No se abrió la instalación. Seguí los pasos de arriba desde el menú del navegador."))}
          className="mt-3 min-h-11 rounded-full bg-terracotta px-4 py-2.5 text-sm font-extrabold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
          Instalar la app
        </button>
      )}
      {message && <p role="status" className="mt-2 text-sm text-ink">{message}</p>}
    </section>
  );
}
