import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES } from "@/lib/seed/articles";

// Public landing page for non-users (build plan P1.6). Lives outside the
// (app) route group, so it renders in the root layout WITHOUT the app shell
// (header/bottom nav) — it's a front door, not part of the tool. Static, so
// it's cheap and indexable. Deliberately name-free until the rename (R1);
// uses neutral descriptors.
export const metadata: Metadata = {
  title: "Una app de embarazo hecha para Paraguay",
  description:
    "Seguimiento del embarazo semana a semana, guías locales, carné perinatal digital y directorio. Gratis, se instala desde un link y funciona sin internet. Privada: tus datos quedan en tu teléfono.",
  alternates: { canonical: "/conoce" },
};

const FEATURES = [
  {
    title: "Semana a semana",
    desc: "Tu embarazo explicado semana por semana, con comparaciones y datos pensados para acá.",
  },
  {
    title: "Herramientas",
    desc: "Pataditas, contracciones, peso, síntomas, fotos y el carné perinatal, siempre con vos.",
  },
  {
    title: "Tus derechos",
    desc: "Licencia de maternidad, subsidio de IPS y gratuidad en salud pública, según tu situación.",
  },
  {
    title: "Cerca tuyo",
    desc: "Sanatorios, ecografías y farmacias por departamento, a un toque de WhatsApp.",
  },
  {
    title: "Emergencia",
    desc: "141 y 911 a un toque, señales de alarma y tus contactos, incluso sin internet.",
  },
  {
    title: "Planeando",
    desc: "Calendario menstrual, días fértiles estimados y checklist si estás buscando embarazo.",
  },
];

export default function ConocePage() {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      {/* Hero */}
      <section className="text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-petrol/10"
          aria-hidden
        >
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path
              d="M4 19c0-7 6-12 12-12s12 5 12 12c0 3-2 5-5 5H9c-3 0-5-2-5-5z"
              fill="#1F5F5B"
              fillOpacity="0.15"
            />
            <path
              d="M5 20c2.5-1.5 6-2 11-2s8.5.5 11 2"
              stroke="#1F5F5B"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="16" cy="14" r="3.2" fill="#D9714B" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl font-medium leading-snug text-petrol-dark">
          Tu embarazo, acompañado y hecho para Paraguay
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Una app gratuita de embarazo, semana a semana, con guías locales,
          carné perinatal digital, tus derechos y un directorio cerca tuyo. Se
          instala desde un link, funciona sin internet y con poca data.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-tile bg-petrol px-6 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Abrir la app
        </Link>
      </section>

      {/* Privacy pillar */}
      <section className="mt-8 rounded-card border border-sage/30 bg-sage/5 p-4 text-center">
        <h2 className="text-base font-medium text-petrol-dark">
          Privada por diseño
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          No te pedimos cuenta, ni correo, ni teléfono. Tus datos de salud se
          guardan solo en tu dispositivo, no en un servidor.{" "}
          <Link href="/privacidad" className="underline">
            Cómo cuidamos tu privacidad
          </Link>
          .
        </p>
      </section>

      {/* Features */}
      <section className="mt-8 grid grid-cols-1 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-card bg-white p-4 shadow-soft">
            <h2 className="text-base font-medium text-ink">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* SEO: guía links */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink">Guías del embarazo</h2>
        <ul className="mt-2 space-y-1.5">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/guias/${a.slug}`}
                className="text-sm text-petrol underline"
              >
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-tile bg-petrol px-6 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Empezar ahora
        </Link>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Herramienta informativa; no reemplaza la atención de un profesional
          de la salud ni realiza diagnósticos.
        </p>
      </section>
    </main>
  );
}
