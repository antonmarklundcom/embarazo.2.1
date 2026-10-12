import { useState } from "react";

// W4: "Borrar todos mis datos", moved verbatim out of AjustesClient with its
// confirmation state. The wipe itself stays in AjustesClient — it is the one
// handler on this screen that navigates, and the router belongs to the shell.
export function DangerZone({ onWipe }: { onWipe: () => void | Promise<void> }) {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function wipe() {
    setBusy(true);
    setError("");
    try {
      await onWipe();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos borrar los datos. Probá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
      <h2 className="text-base font-medium text-terracotta">
        Borrar datos de este teléfono
      </h2>
      <p className="mt-1 text-sm text-muted">
        Cerramos tu sesión y borramos el perfil, los registros, las fotos y el
        PIN de este teléfono. Tu cuenta y su copia en la nube siguen existiendo:
        para eliminarlas, usá «Borrar mi cuenta». Tus notas con PIN se guardan
        solo acá y se pierden si no descargaste una copia de seguridad.
      </p>
      {!confirmWipe ? (
        <button
          type="button"
          onClick={() => setConfirmWipe(true)}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-terracotta shadow-soft"
        >
          Borrar datos de este teléfono
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-extrabold text-ink">
            ¿Seguro? Lo que no tenga una copia se pierde para siempre.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void wipe()}
              disabled={busy}
              className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Cerrando sesión…" : "Sí, borrar este teléfono"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmWipe(false)}
              disabled={busy}
              className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-terracotta">{error}</p>}
    </section>
  );
}
