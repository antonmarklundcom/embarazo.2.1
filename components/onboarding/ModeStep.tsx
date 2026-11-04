"use client";

import type { AppMode } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";

/**
 * "¿Cómo querés usar la app?" — and, since K9-F5, "¿te invitaron?".
 *
 * Night run item 10 (2026-11-04, PRODUCT-NEXT-STEPS item 2): the pregnant
 * mother is the main path, so "Estoy embarazada" is the one large, filled
 * button, first. Planning and the invited entrance are smaller, outlined
 * entrances underneath — still there, still working, same accessible names —
 * so somebody who is planning or holding a code finds them without every
 * pregnant woman having to weigh three equal cards first.
 *
 * The invite entry is still deliberately *not* a mode. It is not a way to use
 * the app — a companion still uses the pregnancy mode, just somebody else's —
 * it is the line underneath, where somebody holding a code will look for it.
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
        ¿Cómo querés usar {APP_NAME}?
      </p>
      <button
        type="button"
        onClick={() => onChoose("embarazada")}
        className="block w-full cursor-pointer rounded-card bg-petrol p-5 text-left text-white shadow-soft transition hover:bg-petrol/90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="block text-lg font-extrabold">Estoy embarazada</span>
        <span className="mt-1 block text-sm text-white/85">
          Seguí tu embarazo semana a semana, con herramientas y recursos.
        </span>
      </button>

      <p className="px-1 pt-2 text-xs font-bold text-muted">¿Otra situación?</p>
      <button
        type="button"
        onClick={() => onChoose("planeando")}
        className="block min-h-[44px] w-full cursor-pointer rounded-tile border border-line bg-white px-4 py-2.5 text-left text-ink transition hover:border-petrol/40 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="block text-sm font-extrabold">Estoy planeando / buscando</span>
        <span className="mt-0.5 block text-xs text-muted">
          Calendario menstrual, días fértiles estimados y checklist preconcepción.
        </span>
      </button>
      <div className="rounded-tile border border-line bg-pastel-celeste px-4 py-2.5">
        <p className="text-sm font-extrabold text-ink">
          Me invitaron / tengo un código
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink/80">
          Si alguien te pasó un link o un código para acompañar su embarazo,
          entrá por acá: no te vamos a preguntar por tus fechas.
        </p>
        <button
          type="button"
          onClick={onInvited}
          className="mt-2 min-h-[44px] w-full cursor-pointer rounded-tile bg-white px-4 text-sm font-extrabold text-petrol shadow-soft transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Usar mi código
        </button>
      </div>
      <p className="px-1 text-xs text-muted">
        Podés cambiar de modo cuando quieras desde Ajustes, sin perder tus datos.
      </p>
    </div>
  );
}
