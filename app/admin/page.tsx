import Link from "next/link";
import { z } from "zod";

import {
  adminDb,
  findUserByEmail,
  recentAudit,
  requireAdmin,
} from "@/lib/server/admin";
import { aiBabyAlertShare, aiSpendReport, drizzleAiSpendStore } from "@/lib/server/aiSpend";
import { loadAdminSummary, type PushSummary } from "@/lib/server/adminSummary";
import { getFlags, isFlagStoreAvailable } from "@/lib/server/flags";
import { drizzlePushHealthStore } from "@/lib/server/pushHealth";
import { getRevision } from "@/lib/server/revision";

// BUILD-PLAN A7 — find a user, and see what has been done lately.
//
// Search is by exact email, deliberately. A substring search over a health
// app's user table is a browsing tool, and browsing is not support: the three
// real tickets ("no puedo entrar", "perdí mis datos", "sacá a mi ex del
// embarazo") all start with someone telling you their address.

export const dynamic = "force-dynamic";

const QuerySchema = z.object({ email: z.string().email().max(255) });

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Cell({
  label,
  value,
  note,
  alert = false,
}: {
  label: string;
  value: string;
  note?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-tile border border-black/10 bg-cream p-3">
      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-1 text-base font-black ${alert ? "text-terracotta" : "text-ink"}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-muted">{note}</dd>}
    </div>
  );
}

/** What the push numbers say, in words; "sin base de datos" when there is none. */
function pushCells(push: PushSummary) {
  if (push.kind === "ok") {
    return {
      last: push.lastSentAt === null ? "Nunca" : formatDate(new Date(push.lastSentAt)),
      overdue: String(push.overdue),
      overdueNote:
        push.overdueOverHour > 0
          ? `${push.overdueOverHour} con más de 1 hora`
          : push.overdue > 0
            ? "Ninguno con más de 1 hora"
            : undefined,
      stuck: push.overdueOverHour > 0,
    };
  }
  const text = push.kind === "no-database" ? "sin base de datos" : "no se pudo leer";
  return { last: text, overdue: text, overdueNote: undefined, stuck: false };
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const database = adminDb();
  const params = await searchParams;

  const raw = typeof params.email === "string" ? params.email.trim() : "";
  const parsed = raw ? QuerySchema.safeParse({ email: raw }) : null;
  const matches =
    parsed?.success && database
      ? await findUserByEmail(database, parsed.data.email)
      : [];
  const audit = database ? await recentAudit(database, 15) : [];

  // U11 — docs/log/u2.md flagged that this page had no slot for the AI
  // spend-alert banner. Same "metadata only, fail gracefully with no
  // DATABASE_URL" shape as everything else here: no database means no
  // banner, never a crash.
  const currentMonthSpend = database
    ? (await aiSpendReport(drizzleAiSpendStore(database)))[0]
    : null;
  const alertShare = aiBabyAlertShare(process.env);
  const spendAlerting =
    !!currentMonthSpend &&
    currentMonthSpend.ceilingUsd > 0 &&
    currentMonthSpend.spendShare >= alertShare;

  // The state-of-the-service strip: deployed revision, when the dispatcher last
  // sent, how many reminders are overdue, and the flags. Read-only, counts only.
  const summary = await loadAdminSummary({
    revision: getRevision(),
    pushStore: database ? drizzlePushHealthStore(database) : null,
    readFlags: getFlags,
    flagsFromDatabase: isFlagStoreAvailable(),
  });
  const push = pushCells(summary.push);

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="estado-ahora"
        className="rounded-card border border-line bg-white p-4 shadow-soft"
      >
        <h2 id="estado-ahora" className="text-base font-extrabold text-ink">
          Estado ahora
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Cell
            label="Versión publicada"
            value={summary.revision === "unknown" ? "desconocida" : summary.revision}
          />
          <Cell label="Último aviso enviado" value={push.last} />
          <Cell
            label="Avisos atrasados"
            value={push.overdue}
            note={push.overdueNote}
            alert={push.stuck}
          />
        </dl>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Funciones</h3>
          <Link href="/admin/avisos" className="text-xs font-bold text-petrol underline">
            Detalle de avisos
          </Link>
        </div>
        <ul className="mt-1 space-y-1 text-sm">
          {summary.flags.map((flag) => (
            <li key={flag.key} className="flex justify-between gap-3">
              <code className="text-ink">{flag.key}</code>
              <span className={flag.on ? "font-black text-petrol" : "text-muted"}>
                {flag.on ? "Prendida" : "Apagada"}
              </span>
            </li>
          ))}
        </ul>
        {!summary.flagsFromDatabase && (
          <p className="mt-2 text-xs text-muted">
            Sin base de datos: las funciones están en su valor por defecto.
          </p>
        )}
      </section>

      {spendAlerting && (
        <Link
          href="/admin/ia"
          className="block rounded-card border border-terracotta bg-terracotta/10 p-4 shadow-soft"
        >
          <p className="text-sm font-extrabold text-terracotta">
            El gasto de IA de este mes está cerca del límite
          </p>
          <p className="mt-1 text-xs text-terracotta">
            Ya se usó {Math.round((currentMonthSpend?.spendShare ?? 0) * 100)}%
            del techo mensual. Ver el detalle y pausar si hace falta →
          </p>
        </Link>
      )}

      {/* U11 — a more discoverable entry point into the two operational
          panels; the nav bar in app/admin/layout.tsx already links both. */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/flags"
          className="rounded-card border border-line bg-white p-4 shadow-soft"
        >
          <p className="text-sm font-extrabold text-ink">Funciones</p>
          <p className="mt-1 text-xs text-muted">Prender o apagar features</p>
        </Link>
        <Link
          href="/admin/ia"
          className="rounded-card border border-line bg-white p-4 shadow-soft"
        >
          <p className="text-sm font-extrabold text-ink">IA</p>
          <p className="mt-1 text-xs text-muted">Uso y gasto del mes</p>
        </Link>
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h1 className="text-lg font-black text-ink">Buscar una cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Por correo exacto, el que la persona te dio.
        </p>
        <form method="get" className="mt-3 flex gap-2">
          <input
            type="email"
            name="email"
            defaultValue={raw}
            placeholder="alguien@ejemplo.com"
            className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 text-sm focus:border-petrol focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-tile bg-petrol px-4 text-sm font-extrabold text-white"
          >
            Buscar
          </button>
        </form>

        {raw && parsed && !parsed.success && (
          <p className="mt-3 text-sm text-terracotta">
            Ese no parece un correo válido.
          </p>
        )}
        {raw && parsed?.success && matches.length === 0 && (
          <p className="mt-3 text-sm text-muted">
            No hay ninguna cuenta con ese correo.
          </p>
        )}

        {matches.length > 0 && (
          <ul className="mt-3 space-y-2">
            {matches.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/usuarios/${user.id}`}
                  className="flex min-h-[44px] items-center justify-between rounded-tile border border-black/10 bg-cream px-3 text-sm font-semibold text-ink"
                >
                  <span className="truncate">{user.email}</span>
                  <span className="text-muted">ver →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Últimas acciones del panel
        </h2>
        <p className="mt-1 text-sm text-muted">
          Todo lo que hacemos acá queda registrado, con quién lo hizo.
        </p>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Todavía no hay nada.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {audit.map((row) => (
              <li
                key={row.id}
                className="rounded-tile border border-black/10 bg-cream p-3 text-sm"
              >
                <p className="font-semibold text-ink">{row.action}</p>
                <p className="text-xs text-muted">
                  {formatDate(row.createdAt)} · {row.actorUserId}
                  {row.targetUserId ? ` → ${row.targetUserId}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
