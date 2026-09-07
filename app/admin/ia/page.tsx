import { adminDb, requireAdmin } from "@/lib/server/admin";
import { aiBabyMonthlyQuota, aiBabySpendCeilingMicros } from "@/lib/ai/quota";
import { aiBabyAlertShare, aiSpendReport, drizzleAiSpendStore, type MonthSpend } from "@/lib/server/aiSpend";
import { getFlag, isFlagStoreAvailable } from "@/lib/server/flags";
import { AiSpendControls } from "@/components/admin/AiSpendControls";

// BUILD-PLAN I4 — "what did AI cost this month, and can I stop it in one
// click": the founder's own framing (docs/HANDOFF-2026-09-06.md §3). Same
// shape as `/admin/patrocinios` — a real page for a founder question, no
// chart library, numbers a person can check by hand.
//
// Metadata only, on purpose: `aiSpendReport` reads `userId`/`status`/
// `costUsdMicros` from `aiGenerations`, which has no column for a prompt or a
// photo at all (F1's header explains why). There is nothing to leak here
// because there is nothing here to leak.

export const dynamic = "force-dynamic";

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, m! - 1, 1));
  const label = date.toLocaleDateString("es-PY", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatUsd(value: number): string {
  return `US$ ${value.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// F2's own approximation, reused here rather than a second conversion rule:
// the founder-facing number is USD, with a ₲ estimate beside it.
const USD_TO_GS_APPROX = 7300;

function formatGsApprox(usd: number): string {
  const gs = Math.round(usd * USD_TO_GS_APPROX);
  return `≈ ₲ ${gs.toLocaleString("es-PY")}`;
}

function MonthCard({
  month,
  alertShare,
}: {
  month: MonthSpend;
  alertShare: number;
}) {
  const alerting = month.ceilingUsd > 0 && month.spendShare >= alertShare;
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold capitalize text-ink">
          {monthLabel(month.month)}
        </h2>
        <p className="text-sm font-black text-ink">
          {formatUsd(month.spendUsd)}{" "}
          <span className="text-xs font-semibold text-muted">
            de {formatUsd(month.ceilingUsd)} ({formatGsApprox(month.spendUsd)})
          </span>
        </p>
      </div>

      {alerting && (
        <p className="mt-2 rounded-tile bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta">
          El gasto llegó al {Math.round(month.spendShare * 100)}% del techo mensual.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-tile bg-cream p-2">
          <dt className="text-[11px] text-muted">Generadas</dt>
          <dd className="text-lg font-black text-ink">{month.ok}</dd>
        </div>
        <div className="rounded-tile bg-cream p-2">
          <dt className="text-[11px] text-muted">Fallidas</dt>
          <dd className="text-lg font-black text-ink">{month.failed}</dd>
        </div>
        <div className="rounded-tile bg-cream p-2">
          <dt className="text-[11px] text-muted">Pendientes</dt>
          <dd className="text-lg font-black text-ink">{month.pending}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {month.distinctUsers} persona{month.distinctUsers === 1 ? "" : "s"} generó
        una imagen este mes · {month.usersAtQuota} llegó{month.usersAtQuota === 1 ? "" : "aron"} a
        su límite de {month.quota} por mes.
      </p>
    </section>
  );
}

export default async function AdminIaPage() {
  await requireAdmin();
  const database = adminDb();

  const paused = await getFlag("ai_baby_paused");
  const writable = isFlagStoreAvailable();
  const alertShare = aiBabyAlertShare(process.env);
  const months = database
    ? await aiSpendReport(drizzleAiSpendStore(database))
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-ink">IA — uso y gasto</h1>
            <p className="mt-1 text-sm text-muted">
              Cuánto costó la generación de imagen del bebé este mes y el
              anterior, y cuántas personas la usaron.
            </p>
          </div>
          <AiSpendControls paused={paused} disabled={!writable} />
        </div>
        <p className="mt-3 rounded-tile bg-sand-bg px-3 py-2 text-xs leading-relaxed text-sand-text">
          <strong>Pausar</strong> corta la generación para todo el mundo hasta
          que la reanudés — no cambia ningún límite. Los límites en sí (
          <code>AI_BABY_MONTHLY_QUOTA</code>,{" "}
          <code>AI_BABY_MONTHLY_SPEND_CEILING_USD</code>) se cambian por
          variable de entorno, no desde acá:{" "}
          {aiBabyMonthlyQuota(process.env)} imágenes por persona por mes,
          techo global de {formatUsd(aiBabySpendCeilingMicros(process.env) / 1_000_000)}.
        </p>
        {!writable && (
          <p className="mt-2 rounded-tile bg-cream px-3 py-2 text-xs text-muted">
            Esta instalación no tiene base de datos configurada: no hay nada
            que pausar ni nada que contar.
          </p>
        )}
      </section>

      {!database ? (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Sin base de datos</h2>
          <p className="mt-1 text-sm text-muted">
            La app funciona igual; el conteo de generaciones no existe sin
            base de datos.
          </p>
        </section>
      ) : (
        months.map((month) => (
          <MonthCard key={month.month} month={month} alertShare={alertShare} />
        ))
      )}
    </div>
  );
}
