import { adminDb, requireAdmin } from "@/lib/server/admin";
import {
  drizzlePushHealthStore,
  pushHealth,
  type PushHealth,
} from "@/lib/server/pushHealth";
import { PUSH_CATEGORY_INFO, type PushCategory } from "@/lib/push/categories";

// Salud de los avisos (push): "¿se están mandando los avisos programados?"
// sin tener que leer el log del cron.
//
// Solo conteos y fechas. La página no muestra endpoints, ids de usuaria ni
// correos, y los recordatorios no tienen contenido del lado del servidor.
// Es una página propia (como /admin/ia o /admin/patrocinios): cada pregunta
// operativa del panel tiene la suya y se enlaza desde la barra del layout.

export const dynamic = "force-dynamic";

const LABELS: Record<PushCategory, string> = Object.fromEntries(
  PUSH_CATEGORY_INFO.map((info) => [info.key, info.label]),
) as Record<PushCategory, string>;

function formatWhen(epochMs: number | null): string {
  if (epochMs === null) return "Todavía no se envió ninguno";
  return new Date(epochMs).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-tile bg-cream p-2 text-center">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-lg font-black text-ink">{value}</dd>
    </div>
  );
}

function Report({ health }: { health: PushHealth }) {
  const { subscriptions, reminders } = health;
  return (
    <>
      {health.overdue && (
        <p
          role="alert"
          className="rounded-card border border-terracotta bg-terracotta/10 p-4 text-sm font-extrabold text-terracotta shadow-soft"
        >
          Hay avisos atrasados: revisá el cron de envío.
          <span className="mt-1 block text-xs font-semibold">
            {reminders.dueUnsentOverHour} aviso
            {reminders.dueUnsentOverHour === 1 ? "" : "s"} debía salir hace más
            de 1 hora y sigue sin enviarse.
          </span>
        </p>
      )}

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Recordatorios</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Por enviar ahora" value={reminders.dueUnsent} />
          <Stat label="Atrasados (+1 h)" value={reminders.dueUnsentOverHour} />
          <Stat label="Enviados, 24 h" value={reminders.sentLast24h} />
          <Stat label="Enviados, 7 días" value={reminders.sentLast7d} />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Último envío exitoso:{" "}
          <strong className="text-ink">{formatWhen(reminders.lastSentAt)}</strong>
        </p>

        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-semibold">Categoría</th>
              <th className="py-1 text-right font-semibold">Por enviar</th>
              <th className="py-1 text-right font-semibold">+1 h</th>
              <th className="py-1 text-right font-semibold">24 h</th>
              <th className="py-1 text-right font-semibold">7 días</th>
            </tr>
          </thead>
          <tbody>
            {reminders.perCategory.map((row) => (
              <tr key={row.category} className="border-t border-line">
                <td className="py-1.5 font-semibold text-ink">
                  {LABELS[row.category]}
                </td>
                <td className="py-1.5 text-right">{row.dueUnsent}</td>
                <td className="py-1.5 text-right">{row.dueUnsentOverHour}</td>
                <td className="py-1.5 text-right">{row.sentLast24h}</td>
                <td className="py-1.5 text-right">{row.sentLast7d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Suscripciones</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Total" value={subscriptions.total} />
          <Stat label="Con cuenta" value={subscriptions.linked} />
          <Stat label="Anónimas" value={subscriptions.anonymous} />
        </dl>
        <p className="mt-3 text-xs text-muted">Activaron cada categoría:</p>
        <ul className="mt-1 space-y-1 text-sm">
          {PUSH_CATEGORY_INFO.map((info) => (
            <li key={info.key} className="flex justify-between gap-3">
              <span className="text-ink">{info.label}</span>
              <span className="font-black text-ink">
                {subscriptions.perCategory[info.key]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default async function AdminAvisosPage() {
  await requireAdmin();
  const database = adminDb();
  const health = database
    ? await pushHealth(drizzlePushHealthStore(database))
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h1 className="text-lg font-black text-ink">Avisos — salud del envío</h1>
        <p className="mt-1 text-sm text-muted">
          Si los avisos programados se están enviando de verdad. Solo
          cantidades y fechas: nunca se muestran dispositivos, cuentas ni el
          texto de un aviso.
        </p>
      </section>

      {health ? (
        <Report health={health} />
      ) : (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Sin base de datos</h2>
          <p className="mt-1 text-sm text-muted">
            La app funciona igual; sin base de datos no hay suscripciones ni
            recordatorios que contar.
          </p>
        </section>
      )}
    </div>
  );
}
