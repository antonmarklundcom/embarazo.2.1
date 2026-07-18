import Link from "next/link";
import type { Metadata } from "next";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

export const metadata: Metadata = {
  title: "¿Cuándo consultar por fertilidad?",
  description:
    "Orientación general sobre cuándo conviene consultar a un profesional por fertilidad en Paraguay.",
};

export default function ConsultarFertilidadPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          ¿Cuándo consultar por fertilidad?
        </h1>
        <p className="text-sm text-muted">
          Una orientación general para saber cuándo conviene pedir una consulta.
        </p>
      </header>

      <section className="rounded-card bg-white p-5 shadow-soft">
        <p className="leading-relaxed text-ink">
          Buscar embarazo puede llevar varios meses, y eso es totalmente normal.
          Como orientación general:
        </p>
        <ul className="mt-3 space-y-3">
          <li className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sage" />
            <p className="text-sm leading-relaxed text-ink">
              Si tenés <span className="font-medium">menos de 35 años</span> y
              hace alrededor de <span className="font-medium">12 meses</span> que
              buscás embarazo con relaciones regulares sin lograrlo, puede ser un
              buen momento para consultar.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-terracotta" />
            <p className="text-sm leading-relaxed text-ink">
              Si tenés <span className="font-medium">35 años o más</span>, suele
              recomendarse consultar antes, alrededor de los{" "}
              <span className="font-medium">6 meses</span>.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose" />
            <p className="text-sm leading-relaxed text-ink">
              Si ya conocés alguna condición que pueda influir (ciclos muy
              irregulares, antecedentes ginecológicos, etc.), conversalo con tu
              médico/a sin esperar.
            </p>
          </li>
        </ul>
      </section>

      <Link
        href="/directorio"
        className="block rounded-card bg-petrol p-5 text-white shadow-soft transition active:scale-[0.99]"
      >
        <p className="text-sm text-white/70">Cerca tuyo</p>
        <p className="mt-1 text-base font-medium">
          Buscá obstetras y ginecología en tu departamento
        </p>
        <span className="mt-2 inline-block text-sm font-medium text-rose">
          Ver el directorio →
        </span>
      </Link>

      <MedicalReviewByline />
      <p className="text-[11px] leading-relaxed text-muted">
        Esta información es orientativa y general, no es un diagnóstico. Cada
        persona y cada pareja es distinta: tu profesional de salud es quien puede
        evaluar tu caso.
      </p>
    </div>
  );
}
