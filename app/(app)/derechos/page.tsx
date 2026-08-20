"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import {
  PHASE_LABELS,
  WORK_SITUATIONS,
  benefitsByPhase,
  computeLeavePlan,
  formatDateEsPy,
  type BenefitItem,
  type WorkSituation,
} from "@/lib/derechos";
import { Bilingual } from "@/components/Bilingual";
import { defaultWorkSituation } from "@/lib/onboarding/personalisation";

// "¿Qué me corresponde?" — benefits & rights navigator. Pure client UI over
// the typed catalog in lib/derechos.ts; the only personal input (work
// situation) stays in component state and is never transmitted.
//
// K9-F5: the answer is no longer thrown away on every exit. Onboarding asks it
// once, and this page opens on it — still as a selected, changeable choice
// rather than silently applied, because "trabajo sin IPS" today can be
// "trabajo y aporto" next month and she has to be able to say so. A woman who
// skipped the question in onboarding gets the page exactly as it always was:
// nothing selected, and it asks.
export default function DerechosPage() {
  const profile = useProfile();
  const [situation, setSituation] = useState<WorkSituation | null>(null);
  // Once, when the profile lands. Not a derived value: after the first read
  // this is *her* choice on this screen, and a later Dexie notification must
  // not snap the page back to the stored answer while she is reading.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || profile.loading) return;
    setSeeded(true);
    setSituation(defaultWorkSituation(profile));
  }, [seeded, profile]);

  const plan =
    profile.hasPregnancy && profile.dueDate
      ? computeLeavePlan(profile.dueDate)
      : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Tus derechos y beneficios
        </h1>
        <p className="mt-1 text-sm text-muted">
          Licencia, IPS, gratuidad y ayudas: qué te corresponde en Paraguay
          según tu situación. Tu respuesta queda solo en tu teléfono.
        </p>
      </header>

      <section aria-labelledby="situacion" className="space-y-3">
        <h2 id="situacion" className="text-sm font-extrabold text-ink">
          ¿Cuál es tu situación de trabajo hoy?
        </h2>
        <div className="space-y-2">
          {WORK_SITUATIONS.map((s) => {
            const selected = situation === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSituation(s.key)}
                aria-pressed={selected}
                className={`block w-full rounded-card border p-4 text-left shadow-soft transition active:scale-[0.99] ${
                  selected
                    ? "border-petrol bg-petrol text-white"
                    : "border-transparent bg-white text-ink"
                }`}
              >
                <p className="text-base font-medium">{s.label}</p>
                <p
                  className={`mt-0.5 text-xs ${selected ? "text-white/70" : "text-muted"}`}
                >
                  {s.hint}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {situation && (
        <div className="space-y-5">
          {benefitsByPhase(situation).map((group) => (
            <section key={group.phase} className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
                {PHASE_LABELS[group.phase]}
              </h2>
              {group.items.map((b) => (
                <BenefitCard
                  key={b.id}
                  benefit={b}
                  dates={
                    plan && b.id === "licencia-maternidad" ? (
                      <>
                        Con tu fecha probable de parto, podrías empezar la
                        licencia el{" "}
                        <strong>{formatDateEsPy(plan.earliestStart)}</strong> y
                        terminaría alrededor del{" "}
                        <strong>{formatDateEsPy(plan.end)}</strong>.
                      </>
                    ) : plan && b.id === "subsidio-ips" ? (
                      <>
                        En tu caso, podrías gestionar el reposo desde el{" "}
                        <strong>
                          {formatDateEsPy(plan.reposoAvailableFrom)}
                        </strong>{" "}
                        aproximadamente (semana 38).
                      </>
                    ) : null
                  }
                />
              ))}
            </section>
          ))}

          <section className="rounded-card border border-terracotta/20 bg-terracotta/5 p-4">
            <p className="text-xs leading-relaxed text-muted">
              Esta información es general y orientativa, no asesoría legal. Los
              montos y trámites pueden cambiar: verificá los detalles en IPS,
              el MTESS o tu servicio de salud. Si creés que un derecho no se te
              respeta, buscá asesoría laboral; en muchos casos es gratuita.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function BenefitCard({
  benefit,
  dates,
}: {
  benefit: BenefitItem;
  dates: React.ReactNode;
}) {
  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <Bilingual
        as="div"
        className="text-base font-extrabold text-ink"
        gnClassName="mt-0.5 block text-sm font-bold italic text-muted"
        text={benefit.title}
      />
      <p className="mt-1 text-sm leading-relaxed text-ink/90">{benefit.body}</p>
      {dates && (
        <p className="mt-2 rounded-tile bg-sage/10 p-3 text-sm leading-relaxed text-ink">
          {dates}
        </p>
      )}
      {benefit.action && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <span className="font-medium text-petrol">Qué hacer:</span>{" "}
          {benefit.action}
        </p>
      )}
      {benefit.legalBasis && (
        <p className="mt-2 text-xs text-muted">{benefit.legalBasis}</p>
      )}
    </article>
  );
}
