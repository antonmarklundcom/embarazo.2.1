"use client";

import type { AppMode } from "@/lib/db";

import { ChoiceCard } from "./controls";

/**
 * "¿Cómo querés usar Mi Bebé?" — and, since K9-F5, "¿te invitaron?".
 *
 * The invite entry is deliberately *not* a third card. It is not a third way
 * to use the app — a companion still uses the pregnancy mode, just somebody
 * else's — and giving it equal visual weight would ask every new user to
 * classify herself against an option that only makes sense to the small number
 * of people arriving from a WhatsApp link. It is the line underneath, where
 * somebody holding a code will look for it and nobody else will trip over it.
 */
export function ModeStep({
  onChoose,
  onInvited,
}: {
  onChoose: (mode: AppMode) => void;
  onInvited: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-sm font-extrabold text-ink">
        ¿Cómo querés usar Mi Bebé?
      </p>
      <ChoiceCard
        title="Estoy embarazada"
        desc="Seguí tu embarazo semana a semana, con herramientas y recursos."
        onClick={() => onChoose("embarazada")}
      />
      <ChoiceCard
        title="Estoy planeando / buscando"
        desc="Calendario menstrual, días fértiles estimados y checklist preconcepción."
        onClick={() => onChoose("planeando")}
      />
      <p className="px-1 text-xs text-muted">
        Podés cambiar de modo cuando quieras desde Ajustes, sin perder tus datos.
      </p>
      <div className="rounded-card border border-line bg-pastel-celeste p-4">
        <p className="text-sm font-extrabold text-ink">
          Me invitaron / tengo un código
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Si alguien te pasó un link o un código para acompañar su embarazo,
          entrá por acá: no te vamos a preguntar por tus fechas.
        </p>
        <button
          type="button"
          onClick={onInvited}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-white px-4 text-sm font-extrabold text-petrol shadow-soft transition active:scale-[0.99]"
        >
          Usar mi código
        </button>
      </div>
    </div>
  );
}
