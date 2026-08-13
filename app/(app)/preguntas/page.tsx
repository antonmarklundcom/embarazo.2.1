import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/FaqAccordion";
import { FAQ_TOPIC_LABELS } from "@/lib/seed/faq";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Quién ve tus datos, qué pasa si borrás la app, si hace falta una cuenta y quién revisa la información médica de Mi Bebé.",
};

// BUILD-PLAN E6 — the FAQ page (feature map #29).
//
// Statically rendered so it precaches with the rest of the app: the questions
// people ask about privacy are the ones they ask *before* trusting an app with
// a pregnancy, and needing signal to read the answer is a bad first impression.

export default function PreguntasPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Preguntas frecuentes
        </h1>
        <p className="text-sm text-muted">
          Lo que más nos preguntan sobre tus datos, tu cuenta y la app.
        </p>
      </header>

      <FaqAccordion topics={["privacidad"]} title={FAQ_TOPIC_LABELS.privacidad} />
      <FaqAccordion topics={["cuenta"]} title={FAQ_TOPIC_LABELS.cuenta} />
      <FaqAccordion topics={["app"]} title={FAQ_TOPIC_LABELS.app} />
      <FaqAccordion topics={["salud"]} title={FAQ_TOPIC_LABELS.salud} />

      <p className="text-sm text-muted">
        ¿Te quedó una duda que no está acá? Escribinos: la lista crece con lo
        que nos preguntan. Ver también la{" "}
        <Link href="/privacidad" className="font-bold underline">
          política de privacidad
        </Link>{" "}
        y los{" "}
        <Link href="/terminos" className="font-bold underline">
          términos
        </Link>
        .
      </p>
    </div>
  );
}
