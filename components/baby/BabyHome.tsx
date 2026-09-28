"use client";

import Link from "next/link";

import { babyAge, babyAgeLabel } from "@/lib/baby/age";
import {
  BABY_ALARM_SIGNS,
  PAPERWORK_GUIDE,
  SLEEP_LINES,
  VACCINE_LINES,
  feedingLines,
  stageFor,
} from "@/lib/baby/content";
import { useImageLoaded } from "@/lib/hooks/useImageFailed";

// Growth plan item 9 ("Ya nació", G2) — the top of Hoy once a birth date exists.
//
// The age leads ("Tu bebé tiene 5 semanas"), then four cards: vacunas,
// trámites, alimentación y sueño, señales de alarma. The rest of Hoy that is
// not about a pregnancy week (mood check-in, tools, footer) stays below it in
// `app/(app)/page.tsx`; nothing she recorded while pregnant is hidden.
//
// The picture per age band is named in `docs/imagery-manifest.json` ("baby")
// and may not exist yet: the image stays invisible until it has loaded, and
// the drawn circle is what shows until then — or for good, if it never comes.

function StageFallback() {
  return (
    <svg viewBox="0 0 120 90" width={160} height={120} aria-hidden className="block">
      <ellipse cx="60" cy="80" rx="44" ry="6" fill="#EDE5DA" />
      <circle cx="60" cy="42" r="30" fill="#F3DAD4" stroke="#2F5D50" strokeWidth="1.6" />
      <circle cx="50" cy="42" r="2" fill="#2F5D50" />
      <circle cx="70" cy="42" r="2" fill="#2F5D50" />
      <path d="M52 52c4 4 12 4 16 0" fill="none" stroke="#2F5D50" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M58 13c3-3 7-2 7 1" fill="none" stroke="#2F5D50" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Card({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={`rounded-card p-4 shadow-soft ${tone}`}>
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-ink">{children}</div>
    </section>
  );
}

export function BabyHome({ birthDate, now = Date.now() }: { birthDate: number; now?: number }) {
  const age = babyAge(birthDate, now);
  const stage = stageFor(age);
  const { ref, loaded, onLoad } = useImageLoaded();
  const born = new Date(birthDate).toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <section aria-label="Tu bebé" className="overflow-hidden rounded-card bg-pastel-arena p-5 shadow-soft">
        <p className="text-[11px] font-extrabold tracking-[1.6px] text-sand-text">YA NACIÓ · {born.toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Tu bebé tiene {babyAgeLabel(age)}</h1>
        <figure className="m-0 mt-4 flex justify-center">
          {/* A plain <img>, like WeekHeroImage: offline-first, precached by the
              service worker, and the load event is what reveals it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={ref}
            src={stage.image}
            alt={loaded ? stage.alt : ""}
            aria-hidden={loaded ? undefined : true}
            width={240}
            height={180}
            onLoad={onLoad}
            className={loaded ? "block h-[180px] w-[240px] rounded-2xl object-cover" : "hidden"}
          />
          {!loaded && <StageFallback />}
        </figure>
      </section>

      <Card title="Vacunas" tone="bg-white">
        {VACCINE_LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Card>

      <Card title="Trámites" tone="bg-pastel-celeste">
        <p>Certificado de nacido vivo, inscripción en el Registro Civil y la cédula del bebé, paso a paso.</p>
        <Link href={PAPERWORK_GUIDE} className="inline-block min-h-[44px] py-2 font-bold text-petrol">
          Ver los trámites →
        </Link>
      </Card>

      <Card title="Alimentación y sueño" tone="bg-pastel-salvia">
        <ul className="list-disc space-y-1 pl-5">
          {feedingLines(age).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="pt-1 font-bold">Para dormir seguro</p>
        <ul className="list-disc space-y-1 pl-5">
          {SLEEP_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>

      <Card title="Señales de alarma en tu bebé" tone="bg-pastel-rosa">
        <p>Si notás cualquiera de estas, llevalo ya a un servicio de salud:</p>
        <ul className="space-y-1">
          {BABY_ALARM_SIGNS.map((sign) => (
            <li key={sign}>
              <Link href="/emergencia" className="flex min-h-[44px] items-center justify-between gap-2 font-semibold text-ink">
                <span>{sign}</span>
                <span aria-hidden className="text-terracotta">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-1 text-xs text-muted">
        Información general: no reemplaza los controles del bebé con su pediatra o en tu servicio de salud.
      </p>
    </div>
  );
}
