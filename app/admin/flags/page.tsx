import { requireAdmin } from "@/lib/server/admin";
import {
  adminEmailById,
  flagAudit,
  getFlags,
  isFlagStoreAvailable,
} from "@/lib/server/flags";
import { FLAG_DEFINITIONS, FLAG_KEYS } from "@/lib/flags/keys";
import { FlagToggle } from "@/components/admin/FlagToggles";

// BUILD-PLAN I5 / U1 — flipping a feature without a deploy.
//
// The screen the panel did not have: until now, pausing the AI baby feature or
// revealing a new rail meant editing an environment variable and waiting for a
// redeploy. It is one page, one row per key, and every row says the same five
// things: what it is, who it reaches, what it is now, who changed it last, and
// a button that names what it is about to do.
//
// What this page cannot do is as important as what it can. It cannot ENABLE
// anything that costs money — `ai_baby_paused` is a brake on top of
// `AI_BABY_ENABLED`, never a substitute for it. See the header of
// `lib/server/flags.ts`; the note is repeated on screen for the person
// clicking, because the guarantee is only useful if they know they have it.

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Date(value).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminFlagsPage() {
  await requireAdmin();

  const writable = isFlagStoreAvailable();
  const values = await getFlags();
  const audit = await flagAudit();
  const editors = Object.fromEntries(
    await Promise.all(
      FLAG_KEYS.map(
        async (key) =>
          [key, await adminEmailById(audit[key]?.updatedBy ?? null)] as const,
      ),
    ),
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-black text-ink">Funciones</h1>
        <p className="mt-1 text-sm text-muted">
          Prendé y apagá funciones sin volver a desplegar. El cambio se ve en
          toda la app en menos de un minuto y queda registrado con tu nombre.
        </p>
        <p className="mt-2 rounded-tile bg-sand-bg px-3 py-2 text-xs leading-relaxed text-sand-text">
          Este panel <strong>nunca enciende algo que cueste plata</strong>. La
          generación con IA se enciende solamente en el servidor
          (<code>AI_BABY_ENABLED</code>); desde acá solo se la puede pausar.
        </p>
        {!writable && (
          <p className="mt-2 rounded-tile bg-cream px-3 py-2 text-xs text-muted">
            Esta instalación no tiene base de datos configurada, así que las
            funciones se muestran en sus valores por defecto y no se pueden
            cambiar.
          </p>
        )}
      </section>

      <section className="space-y-3">
        {FLAG_KEYS.map((key) => {
          const definition = FLAG_DEFINITIONS[key];
          const changed = audit[key];
          return (
            <article
              key={key}
              className="rounded-card border border-line bg-white p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-[15px] font-extrabold text-ink">
                      <code>{key}</code>
                    </h2>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-petrol">
                      {definition.scope === "client"
                        ? "se ve en el teléfono"
                        : "solo servidor"}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        values[key] ? "text-sage" : "text-muted"
                      }`}
                    >
                      {values[key] ? "ACTIVADA" : "APAGADA"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {definition.description}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {changed
                      ? `Último cambio: ${formatDate(changed.updatedAt)}${
                          editors[key] ? ` · ${editors[key]}` : ""
                        }`
                      : `Nunca se cambió (por defecto: ${
                          definition.default ? "activada" : "apagada"
                        })`}
                  </p>
                </div>
                <FlagToggle
                  flagKey={key}
                  value={values[key]}
                  disabled={!writable}
                />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
