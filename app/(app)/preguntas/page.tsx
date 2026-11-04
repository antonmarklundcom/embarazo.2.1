import type { Metadata } from "next";
import Link from "next/link";

import { COMMUNITY_QUESTIONS_ENABLED } from "@/lib/community/launch";
import { CommunityQuestions } from "@/components/CommunityQuestions";
import { FaqAccordion } from "@/components/FaqAccordion";
import { APP_NAME } from "@/lib/brand";
import { JsonLd } from "@/components/JsonLd";
import { FAQ_TOPIC_LABELS, faqFor } from "@/lib/seed/faq";
import { faqPageJsonLd } from "@/lib/seo/jsonLd";
import type { FaqTopic } from "@/lib/types";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: `Quién ve tus datos, qué pasa si borrás la app, si hace falta una cuenta y quién revisa la información médica de ${APP_NAME}.`,
};

// BUILD-PLAN E6 — the FAQ page (feature map #29).
//
// Statically rendered so it precaches with the rest of the app: the questions
// people ask about privacy are the ones they ask *before* trusting an app with
// a pregnancy, and needing signal to read the answer is a bad first impression.

// The accordions below, in order. The FAQPage JSON-LD is built from this same
// list so it can only name questions the page shows (community answers, which
// load at runtime, are left out of it).
const PAGE_TOPICS: readonly FaqTopic[] = ["privacidad", "cuenta", "app", "salud"];

export default function PreguntasPage() {
  const faqLd = faqPageJsonLd(PAGE_TOPICS.flatMap((topic) => faqFor([topic])));
  return (
    <div className="space-y-5">
      <JsonLd data={faqLd} />
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Preguntas frecuentes
        </h1>
        <p className="text-sm text-muted">
          Respuestas sobre tus datos, tu cuenta y cómo usar la app.
        </p>
      </header>

      {PAGE_TOPICS.map((topic) => (
        <FaqAccordion key={topic} topics={[topic]} title={FAQ_TOPIC_LABELS[topic]} />
      ))}

      {/* K20 — the living half of the page. The four accordions above are the
          static FAQ, in git, precached with the app; below is what women
          actually asked, once an admin has answered it. Deliberately in that
          order: the static answers are the ones people came for. */}
      {COMMUNITY_QUESTIONS_ENABLED && <CommunityQuestions />}

      <p className="text-sm text-muted">
        Ver también la{" "}
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
