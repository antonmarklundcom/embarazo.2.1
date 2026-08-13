import Link from "next/link";
import type { Metadata } from "next";

import { MedicalReviewByline } from "@/components/MedicalReviewByline";

export const metadata: Metadata = {
  title: "Salud dental en el embarazo",
  description:
    "Por qué sangran las encías en el embarazo, qué se puede hacer en el dentista estando embarazada y cuándo consultar.",
};

// BUILD-PLAN D2 — dental health (feature map #21).
//
// A static screen on purpose. There is nothing here to time, count or log: the
// value is entirely in correcting two beliefs that cost teeth in Paraguay —
// "estando embarazada no te podés atender" and "las encías sangran, es normal
// del embarazo" — and in saying which treatments are fine and when.
//
// Statically rendered so it precaches with the rest of the app and is readable
// in a waiting room with no signal.

const MYTHS = [
  {
    myth: "«Estando embarazada no te podés atender los dientes.»",
    truth:
      "Sí podés, y conviene. Las limpiezas, los arreglos y hasta las extracciones se pueden hacer durante el embarazo. Avisá siempre que estás embarazada y de cuántas semanas.",
  },
  {
    myth: "«El embarazo te saca un diente por hijo.»",
    truth:
      "No hay nada que saque calcio de tus dientes. Lo que sí pasa es que las encías se inflaman más y los vómitos desgastan el esmalte: las dos cosas se pueden cuidar.",
  },
  {
    myth: "«Si sangran las encías es normal, se pasa después del parto.»",
    truth:
      "Sangrar es señal de gingivitis, no del embarazo. Se trata, y sin tratar puede pasar a periodontitis, que sí se asocia a parto prematuro y bajo peso al nacer.",
  },
  {
    myth: "«Las radiografías y la anestesia hacen mal al bebé.»",
    truth:
      "La radiografía dental con protector de plomo y la anestesia local son seguras en el embarazo. Lo que se posterga, si se puede, es el blanqueamiento y lo estético.",
  },
];

const CARE = [
  "Cepillate dos veces por día con pasta con flúor y usá hilo dental: la mayor parte del sangrado cede en dos semanas de hacerlo bien.",
  "Si vomitaste, enjuagate con agua (o con agua y una cucharadita de bicarbonato) y esperá media hora antes de cepillarte. Cepillar el esmalte recién bañado en ácido lo desgasta.",
  "Si el sabor de la pasta te da náuseas, probá una de niños sin sabor fuerte: es preferible a saltear el cepillado.",
  "Comé algo entre comidas si tenés hambre, pero evitá tener caramelos o gaseosa en la boca todo el día — es la frecuencia, no la cantidad, lo que produce caries.",
];

const SECOND_TRIMESTER = [
  "El mejor momento para el turno de rutina es el segundo trimestre (semanas 14 a 27): pasaron las náuseas y todavía estar acostada boca arriba es cómodo.",
  "Más adelante, pedí que te acomoden un poco de costado sobre el lado izquierdo: boca arriba y mucho rato puede marearte.",
];

export default function DentalPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Salud dental</h1>
        <p className="text-sm text-muted">
          Qué pasa con tus dientes y encías en el embarazo, y qué se puede
          hacer.
        </p>
      </header>

      <section className="rounded-card bg-pastel-rosa p-4">
        <h2 className="text-base font-extrabold text-ink">Consultá pronto si…</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink/90">
          <li>Te sangran las encías al cepillarte, aunque no duela.</li>
          <li>Tenés una muela con dolor, o la cara hinchada.</li>
          <li>Se te aflojó un diente o notás las encías retraídas.</li>
        </ul>
        <p className="mt-2 text-sm font-semibold text-ink">
          Una infección dental no se cura sola y no conviene esperar al parto.
        </p>
        <Link
          href="/directorio"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-tile bg-white px-4 text-sm font-extrabold text-ink"
        >
          Buscar dónde atenderte
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Lo que se dice, y lo que pasa
        </h2>
        {MYTHS.map((item) => (
          <article key={item.myth} className="rounded-card border border-line bg-white p-4">
            <p className="text-sm font-extrabold text-ink">{item.myth}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.truth}</p>
          </article>
        ))}
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">El cuidado de todos los días</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90">
          {CARE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">Cuándo pedir el turno</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90">
          {SECOND_TRIMESTER.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <MedicalReviewByline />
    </div>
  );
}
