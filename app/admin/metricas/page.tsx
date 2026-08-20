import Link from "next/link";

import { adminDb, requireAdmin } from "@/lib/server/admin";
import { allMetrics, type FunnelStep } from "@/lib/server/adminMetrics";

// BUILD-PLAN K16 — `/admin/metricas`.
//
// Pre-launch, because this data cannot be reconstructed retroactively: every
// number is derived from rows the app already writes, but the first month of
// "did onboarding work?" is gone if the page ships in month two.
//
// Everything on this screen is an aggregate. There is no row, no id, no email
// and no date belonging to any one person — see `lib/server/adminMetrics.ts`
// for why that is structural rather than a rendering choice.
//
// Each block carries a sentence saying what its number does **not** mean. That
// is not padding: the two most important numbers here are proxies (writes, not
// opens), and a founder reading "DAU: 41" without knowing it excludes everyone
// who only read their week will make decisions on a number that is not the
// number they think it is.

export const dynamic = "force-dynamic";

const STORE_LABELS: Record<string, string> = {
  profile: "Perfil",
  pregnancy: "Embarazo",
  journalEntries: "Diario y síntomas",
  kickSessions: "Pataditas",
  contractionEntries: "Contracciones",
  weightEntries: "Peso",
  checklistState: "Checklists",
  cycles: "Ciclos (planeando)",
  cycleSettings: "Ajustes de ciclo",
  clinical: "Carné / datos clínicos",
  sleepEntries: "Sueño",
  favoriteNames: "Nombres favoritos",
};

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{note}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.count ?? 0;
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-extrabold text-ink">{step.label}</span>
            <span className="shrink-0 text-sm font-black text-ink">
              {step.count}
              {step.ofPrevious !== null && (
                <span className="ml-2 text-xs font-semibold text-muted">
                  {step.ofPrevious}% del paso anterior
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-pastel-salvia"
              // Widths relative to the first step, so the shape of the drop-off
              // is visible at a glance rather than every bar being full.
              style={{ width: top > 0 ? `${Math.round((step.count / top) * 100)}%` : "0%" }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function AdminMetricsPage() {
  await requireAdmin();
  const database = adminDb();

  if (!database) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-black text-ink">Métricas</h1>
        <p className="text-sm text-muted">
          Este despliegue no tiene base de datos configurada, así que no hay nada
          que medir.
        </p>
      </div>
    );
  }

  const metrics = await allMetrics(database);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-black text-ink">Métricas</h1>
          <Link href="/admin" className="text-[13px] font-extrabold text-terracotta">
            Volver
          </Link>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Todo lo de esta página es agregado: cantidades, nunca personas. No hay
          forma de llegar desde acá a una cuenta ni a un registro.
        </p>
        {metrics.lastWriteAt && (
          <p className="mt-1 text-xs text-muted">
            Última escritura recibida:{" "}
            {new Date(metrics.lastWriteAt).toLocaleString("es-PY")}
          </p>
        )}
      </header>

      <Card
        title="Onboarding"
        note="Cada paso deja un rastro distinto en el servidor; esto los cuenta. Solo mide a quien creó una cuenta — «seguir sin cuenta» no deja rastro y no aparece acá."
      >
        <Funnel steps={metrics.funnel} />
      </Card>

      <Card
        title="Invitaciones"
        note="Separadas por rol porque son dos productos distintos: la invitación a la pareja es de la que depende el crecimiento."
      >
        {metrics.invites.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se invitó a nadie.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-1 font-extrabold">Rol</th>
                <th className="pb-1 text-right font-extrabold">Enviadas</th>
                <th className="pb-1 text-right font-extrabold">Aceptadas</th>
                <th className="pb-1 text-right font-extrabold">Vencidas</th>
                <th className="pb-1 text-right font-extrabold">Anuladas</th>
              </tr>
            </thead>
            <tbody>
              {metrics.invites.map((row) => (
                <tr key={row.role} className="border-t border-line">
                  <td className="py-1.5 font-extrabold text-ink">
                    {row.role === "partner" ? "Pareja" : "Familia"}
                  </td>
                  <td className="py-1.5 text-right text-ink">{row.sent}</td>
                  <td className="py-1.5 text-right font-extrabold text-ink">
                    {row.accepted}
                    {row.sent > 0 && (
                      <span className="ml-1 text-xs font-semibold text-muted">
                        {Math.round((row.accepted / row.sent) * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-muted">{row.expired}</td>
                  <td className="py-1.5 text-right text-muted">{row.revoked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Actividad"
        note="Cuenta a quien ESCRIBIÓ algo, no a quien abrió la app. Alguien que lee su semana y cierra no aparece — y es una usuaria contenta. Es el único rastro que el servidor tiene, y sumar una señal de «estoy acá» a una app de salud no vale una métrica más linda."
      >
        <div className="flex gap-6">
          <Big value={String(metrics.active.daily)} label="escribieron hoy" />
          <Big value={String(metrics.active.weekly)} label="esta semana" />
          <Big
            value={metrics.active.stickiness === null ? "—" : `${metrics.active.stickiness}%`}
            label="diarias / semanales"
          />
        </div>
      </Card>

      <Card
        title="Retención semana 2"
        note="De las cuentas con al menos 14 días, cuántas escribieron algo entre el día 7 y el 14. Las cuentas más nuevas quedan afuera a propósito: incluirlas haría que el número baje cada vez que crece la app."
      >
        <div className="flex gap-6">
          <Big
            value={metrics.retention.percent === null ? "—" : `${metrics.retention.percent}%`}
            label="volvieron"
          />
          <Big value={String(metrics.retention.returned)} label="de vuelta" />
          <Big value={String(metrics.retention.eligible)} label="cuentas elegibles" />
        </div>
      </Card>

      <Card
        title="Familia"
        note="Cuántas personas más, además de la mamá, están adentro de un embarazo. Es la métrica de la que depende la propuesta a los patrocinadores."
      >
        <div className="flex flex-wrap gap-6">
          <Big value={String(metrics.reach.ownersSharing)} label="embarazos compartidos" />
          <Big value={String(metrics.reach.companions)} label="parejas activas" />
          <Big value={String(metrics.reach.usersWithPush)} label="cuentas con avisos" />
          <Big
            value={String(metrics.reach.anonymousDevices)}
            label="dispositivos sin cuenta"
          />
        </div>
      </Card>

      <Card
        title="Herramientas"
        note="Personas y registros por herramienta. Las dos, porque 4 000 pataditas de 12 mujeres y 4 000 de 900 son productos distintos. Aparecen también las que nadie usó — que suele ser la fila más útil."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="pb-1 font-extrabold">Herramienta</th>
              <th className="pb-1 text-right font-extrabold">Personas</th>
              <th className="pb-1 text-right font-extrabold">Registros</th>
            </tr>
          </thead>
          <tbody>
            {metrics.tools.map((row) => (
              <tr key={row.store} className="border-t border-line">
                <td className="py-1.5 font-semibold text-ink">
                  {STORE_LABELS[row.store] ?? row.store}
                </td>
                <td className="py-1.5 text-right font-extrabold text-ink">{row.users}</td>
                <td className="py-1.5 text-right text-muted">{row.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
