import Link from "next/link";
import { notFound } from "next/navigation";

import {
  accountOverview,
  adminDb,
  invitesForUser,
  requireAdmin,
} from "@/lib/server/admin";
import { AdminUserActions } from "@/components/admin/AdminUserActions";

// BUILD-PLAN A7 — account state for one user.
//
// Read the type of `accountOverview` (lib/server/admin.ts) to see what this
// page can possibly show: counts, dates, providers, device and membership
// totals. There is no code path from here to a record's contents, and the
// test suite fails if the word `payload` appears in this directory.
//
// The screen is built around the three support tickets that actually arrive:
// "no puedo entrar" (providers + consent + created), "perdí mis datos"
// (per-store counts + last sync + device count), and "sacá a mi ex del
// embarazo" (memberships + invites).

export const dynamic = "force-dynamic";

function formatDate(value: Date | string | number | null): string {
  if (value === null) return "—";
  return new Date(value).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STORE_LABELS: Record<string, string> = {
  profile: "Perfil",
  pregnancy: "Embarazo",
  journalEntries: "Registros de síntomas",
  kickSessions: "Pataditas",
  contractionEntries: "Contracciones",
  weightEntries: "Peso",
  checklistState: "Checklists",
  cycles: "Ciclos",
  cycleSettings: "Ajustes de ciclo",
  clinical: "Datos clínicos",
};

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const database = adminDb();
  if (!database) notFound();

  const { id } = await params;
  const overview = await accountOverview(database, id);
  if (!overview) notFound();

  const userInvites = await invitesForUser(database, id);
  const totalRecords = overview.recordCounts.reduce(
    (sum, row) => sum + row.total,
    0,
  );

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-bold text-petrol">
        ← Buscar otra cuenta
      </Link>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h1 className="text-lg font-black text-ink">{overview.email}</h1>
        {overview.name && (
          <p className="text-sm text-muted">{overview.name}</p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Cuenta creada</dt>
            <dd className="font-semibold text-ink">
              {formatDate(overview.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ingreso con</dt>
            <dd className="font-semibold text-ink">
              {overview.providers.length > 0
                ? overview.providers.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Consentimiento</dt>
            <dd className="font-semibold text-ink">
              {formatDate(overview.consentAt)}
              {overview.consentVersion ? ` (${overview.consentVersion})` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Rol</dt>
            <dd className="font-semibold text-ink">{overview.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Última sincronización</dt>
            <dd className="font-semibold text-ink">
              {formatDate(overview.lastSyncAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Dispositivos con avisos</dt>
            <dd className="font-semibold text-ink">{overview.deviceCount}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Registros guardados ({totalRecords})
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Cantidades, no contenido. Este panel no puede leer lo que una usuaria
          escribió, y eso es a propósito.
        </p>
        {overview.recordCounts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay nada sincronizado en esta cuenta.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {overview.recordCounts.map((row) => (
              <li
                key={row.store}
                className="flex items-center justify-between border-b border-line py-1.5 last:border-0"
              >
                <span className="text-ink">
                  {STORE_LABELS[row.store] ?? row.store}
                </span>
                <span className="font-semibold text-ink">
                  {row.total - row.deleted}
                  {row.deleted > 0 && (
                    <span className="ml-1 font-normal text-muted">
                      (+{row.deleted} borrados)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Familia e invitaciones
        </h2>
        <p className="mt-1 text-sm text-muted">
          Participa en {overview.membershipCount}{" "}
          {overview.membershipCount === 1 ? "embarazo" : "embarazos"}.
        </p>
        {userInvites.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No creó ninguna invitación.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {userInvites.map((invite) => (
              <li
                key={invite.code}
                className="rounded-tile border border-black/10 bg-cream p-3 text-sm"
              >
                <p className="font-semibold text-ink">
                  {invite.code} · {invite.role}
                </p>
                <p className="text-xs text-muted">
                  vence {formatDate(invite.expiresAt)}
                  {invite.acceptedAt
                    ? ` · aceptada ${formatDate(invite.acceptedAt)}`
                    : ""}
                  {invite.revokedAt ? " · anulada" : ""}
                </p>
                <AdminUserActions kind="invite" code={invite.code} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminUserActions
        kind="delete"
        userId={overview.id}
        email={overview.email}
        recordCount={totalRecords}
      />
    </div>
  );
}
