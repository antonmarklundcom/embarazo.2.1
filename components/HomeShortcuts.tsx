"use client";

import Link from "next/link";

import { WhatsAppButton } from "@/components/WhatsAppButton";
import { businessWhatsApp, waLink } from "@/lib/whatsapp";

// BUILD-PLAN C8 — shortcuts + feedback (feature map #18, #19).
//
// Three things a pregnant woman needs to reach in one tap and cannot go looking
// for: the emergency screen, her carné perinatal, and her next control. They
// exist elsewhere in the app — that is the point; the home screen is where you
// are when you suddenly need one of them.
//
// The feedback card is the testing round's feedback path. It renders **only**
// when a real business number is configured: a "contanos cómo te va" button
// that opens a chat with nobody is worse than no button, and until today three
// screens shipped exactly that (see `lib/whatsapp.ts`).

const BUSINESS_WA = businessWhatsApp(process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP);

const SHORTCUTS = [
  {
    href: "/emergencia",
    title: "Emergencia",
    subtitle: "Números y qué decir",
    tone: "bg-pastel-rosa",
  },
  {
    href: "/herramientas/carne",
    title: "Carné",
    subtitle: "Tus datos del control",
    tone: "bg-pastel-celeste",
  },
  {
    href: "/ajustes",
    title: "Próximo control",
    subtitle: "Anotá la fecha",
    tone: "bg-pastel-salvia",
  },
] as const;

export function HomeShortcuts({ week }: { week: number }) {
  return (
    <div className="space-y-4">
      <section aria-labelledby="accesos" className="space-y-2.5 pt-1">
        <h2
          id="accesos"
          className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
        >
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className={`flex min-h-[84px] flex-col justify-end rounded-card ${shortcut.tone} p-3 transition active:scale-[0.98]`}
            >
              <p className="text-sm font-extrabold leading-tight text-ink">
                {shortcut.title}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight text-ink/70">
                {shortcut.subtitle}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {BUSINESS_WA && (
        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="text-base font-extrabold text-ink">¿Cómo te está yendo?</h2>
          <p className="mt-1 text-sm font-semibold text-muted">
            Contanos qué te sirve y qué te falta. Leemos todos los mensajes y la
            app cambia con lo que nos dicen.
          </p>
          <WhatsAppButton
            href={waLink(
              BUSINESS_WA,
              // The week goes in the message the user reads before pressing
              // send, not in a request to us — see DECISIONS.md "C8".
              `Hola! Estoy usando Mi Bebé (semana ${week}) y quiero contarles cómo me está yendo: `,
            )}
            label="Escribirnos por WhatsApp"
            className="mt-3 w-full"
          />
        </section>
      )}
    </div>
  );
}
