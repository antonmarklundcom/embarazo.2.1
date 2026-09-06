import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PUBLISHED_EJERCICIOS, getEjercicioById } from "@/lib/seed/ejercicios";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

// D6 — static per published exercise, same shape as `/guias/[slug]`. Step
// images are runtime-cached by the service worker (not precached): unlike the
// 42 week renders, this collection can grow without inflating the app's
// offline-install budget.
export async function generateStaticParams() {
  return PUBLISHED_EJERCICIOS.map((exercise) => ({ id: exercise.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exercise = getEjercicioById(id);
  if (!exercise) return { title: "Ejercicio no encontrado" };
  return { title: exercise.title };
}

export default async function EjercicioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = getEjercicioById(id);
  if (!exercise) notFound();

  return (
    <article className="space-y-4">
      <Link href="/herramientas/ejercicios" className="text-sm text-petrol">
        ← Ejercicios
      </Link>

      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">{exercise.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {exercise.durationMin} min · {exercise.equipment}
        </p>
      </header>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Para qué sirve
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/90">
          {exercise.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-ink">Cómo se hace</h2>
        <ol className="space-y-3">
          {exercise.steps.map((step, index) => (
            <li key={index} className="rounded-card border border-line bg-white p-3">
              <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-tile bg-pastel-arena/40">
                <Image
                  src={step.imageSrc}
                  alt={step.text}
                  fill
                  sizes="(max-width: 480px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
              <p className="text-sm leading-relaxed text-ink/90">
                {index + 1}. {step.text}
              </p>
            </li>
          ))}
        </ol>
        {exercise.id === "kegel-piso-pelvico" && (
          <Link
            href="/herramientas/kegel"
            className="block text-sm font-extrabold text-terracotta"
          >
            Abrir el cronómetro de Kegel →
          </Link>
        )}
      </section>

      <section className="rounded-card border border-terracotta/20 bg-terracotta/5 p-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-terracotta">
          Cuándo evitarlo
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink">
          {exercise.avoidIf.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <h2 className="mt-3 text-[11px] font-extrabold uppercase tracking-[1.6px] text-terracotta">
          Parar y consultar si aparece
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink">
          {exercise.stopSigns.map((sign) => (
            <li key={sign}>{sign}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">Fuente: {exercise.source}</p>
      <MedicalReviewByline />
    </article>
  );
}
