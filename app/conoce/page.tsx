import Link from "next/link";
import type { Metadata } from "next";
import { InstallCard } from "@/components/InstallCard";

// P1.6 (BUILD-PLAN.md): public landing page for non-users. "/" is the app
// itself (first-run gate), so organic search / shared links need a page
// that explains the app, states the privacy promise, and funnels into
// install + a few guías for SEO. Deliberately standalone (outside the
// (app) route group): no header/bottom-nav, no client data reads besides
// InstallCard's own hook.
export const metadata: Metadata = {
  title: "Mi Bebé — tu embarazo semana a semana en Paraguay",
  description:
    "La app gratuita del embarazo hecha para Paraguay: semana a semana, tus derechos, herramientas, familia y recursos cercanos. Con cuenta o sin ella.",
  alternates: { canonical: "/conoce" },
};

const FEATURES = [
  {
    title: "Semana a semana",
    body: "El desarrollo de tu bebé, síntomas comunes y consejos, en es-PY, desde la semana 1 hasta el parto.",
    tone: "bg-pastel-arena",
  },
  {
    title: "Tu embarazo, en familia",
    body: "Invitá a tu pareja o familia por WhatsApp: cada uno ve tu semana y lo que vos elijas compartir.",
    tone: "bg-pastel-lavanda",
  },
  {
    title: "Tus derechos en Paraguay",
    body: "Licencia de maternidad, subsidio de IPS, gratuidad en Salud Pública, calculado con tus fechas.",
    tone: "bg-pastel-celeste",
  },
  {
    title: "Herramientas del día a día",
    body: "Contador de pataditas, cronómetro de contracciones, control de peso y diario de fotos de tu panza.",
    tone: "bg-pastel-rosa",
  },
  {
    title: "Recursos cerca tuyo",
    body: "Sanatorios, ecografías y farmacias por departamento, con contacto directo por WhatsApp.",
    tone: "bg-pastel-salvia",
  },
];

const FEATURED_GUIDES = [
  { slug: "senales-de-alarma-embarazo", title: "Señales de alarma en el embarazo" },
  { slug: "control-prenatal-ips-vs-privado", title: "Control prenatal: IPS vs. sanatorio privado" },
  { slug: "derechos-embarazada-que-trabaja", title: "Derechos de la embarazada que trabaja" },
  { slug: "vacunas-en-el-embarazo-pai", title: "Vacunas en el embarazo (esquema PAI)" },
];

export default function ConocePage() {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <div className="mx-auto max-w-md px-5 py-10">
        <header className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-petrol">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 15c0-4.5 3.5-8 8-8s8 3.5 8 8"
                stroke="#FBF7F1"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M4 15c2.5 1.6 5.2 2.5 8 2.5s5.5-.9 8-2.5"
                stroke="#FBF7F1"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="5" r="1.6" fill="#FBF7F1" />
            </svg>
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-ink">
            Mi Bebé
          </h1>
          <p className="mt-2 text-base font-semibold text-muted">
            Tu embarazo, semana a semana, hecho para Paraguay.
          </p>
        </header>

        <section className="mt-8 rounded-card border border-line bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Vos elegís qué compartir
          </p>
          <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
            Con cuenta, tus datos se respaldan y podés invitar a tu familia a
            seguir tu embarazo — vos decidís qué ve cada uno. Preferís no
            crear cuenta: la app funciona igual, completa, y todo queda solo
            en tu teléfono.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className={`rounded-card ${f.tone} p-4`}>
              <h2 className="text-base font-extrabold text-ink">{f.title}</h2>
              <p className="mt-1 text-sm font-semibold text-ink/70">{f.body}</p>
            </div>
          ))}
        </section>

        <div className="mt-6">
          <InstallCard />
        </div>

        <section className="mt-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Algunas de nuestras guías
          </h2>
          <div className="mt-2 space-y-2">
            {FEATURED_GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guias/${g.slug}`}
                className="block rounded-tile border border-line bg-white p-3.5 text-sm font-extrabold text-ink transition active:scale-[0.99]"
              >
                {g.title} →
              </Link>
            ))}
          </div>
          <Link
            href="/guias"
            className="mt-3 inline-block text-sm font-extrabold text-terracotta"
          >
            Ver todas las guías →
          </Link>
        </section>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block min-h-[44px] w-full rounded-tile bg-petrol px-4 py-3 text-center text-sm font-extrabold leading-[1.6] text-white transition active:scale-[0.98]"
          >
            Empezar ahora, es gratis
          </Link>
          <p className="mt-4 text-xs font-semibold text-muted">
            Con cuenta o sin ella. Sin publicidad invasiva. Hecha en Paraguay.
          </p>
        </div>
      </div>
    </div>
  );
}
