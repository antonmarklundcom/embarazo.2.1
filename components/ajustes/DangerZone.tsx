import { useState } from "react";

// W4: "Borrar todos mis datos", moved verbatim out of AjustesClient with its
// confirmation state. The wipe itself stays in AjustesClient — it is the one
// handler on this screen that navigates, and the router belongs to the shell.
export function DangerZone({ onWipe }: { onWipe: () => void }) {
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
      <h2 className="text-base font-medium text-terracotta">
        Borrar todos mis datos
      </h2>
      <p className="mt-1 text-sm text-muted">
        Esto borra de forma definitiva tu perfil, tu embarazo, el diario de
        síntomas y ánimo, las fotos, la fecha del próximo control, las
        pataditas, las contracciones, el peso, las checklists, tu calendario
        menstrual y el PIN. No se puede deshacer.
      </p>
      {!confirmWipe ? (
        <button
          type="button"
          onClick={() => setConfirmWipe(true)}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-terracotta shadow-soft"
        >
          Borrar todos mis datos
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-extrabold text-ink">
            ¿Seguro? Esta acción es definitiva.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onWipe}
              className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white"
            >
              Sí, borrar todo
            </button>
            <button
              type="button"
              onClick={() => setConfirmWipe(false)}
              className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
