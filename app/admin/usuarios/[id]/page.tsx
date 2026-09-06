import Link from "next/link";
import { notFound } from "next/navigation";

import {
  accountOverview,
  adminDb,
  invitesForUser,
  requireAdmin,
} from "@/lib/server/admin";
import {
  RESTORE_WINDOW_DAYS,
  devicesOf,
  membershipsAround,
  recentTombstones,
} from "@/lib/server/support";
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
  // I1/U6 — the three support tickets, answered from this screen.
  const memberships = await membershipsAround(database, id);
  const devices = await devicesOf(database, id);
  const tombstones = await recentTombstones(database, id, Date.now());
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

      {/* I1/U6 — "sacá a mi ex del embarazo". */}
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Quién ve qué</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Cortar el acceso es inmediato: deja de ver la semana, la fecha de
          parto y el próximo control en el momento, sin esperar a que se le
          venza nada.
        </p>
        {memberships.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nadie comparte un embarazo con esta cuenta.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {memberships.map((row) => (
              <li
                key={row.id}
                className="rounded-tile border border-black/10 bg-cream p-3 text-sm"
              >
                <p className="font-semibold text-ink">
                  {row.memberEmail ?? row.memberUserId} · {row.role}
                </p>
                <p className="text-xs text-muted">
                  {row.ownedByThisUser
                    ? "ve el embarazo de esta cuenta"
                    : "esta cuenta ve el embarazo de otra persona"}
                  {" · desde "}
                  {formatDate(row.createdAt)}
                  {row.revokedAt
                    ? ` · cortado ${formatDate(row.revokedAt)}`
                    : ""}
                </p>
                {!row.revokedAt && (
                  <div className="mt-2">
                    <AdminUserActions kind="membership" membershipId={row.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* I1/U6 — "no puedo entrar" and the stolen phone. */}
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Dispositivos</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Solo el servicio de avisos y las fechas. La dirección completa del
          dispositivo no se muestra nunca: sirve para mandarle notificaciones a
          ese teléfono, así que es una llave, no un dato.
        </p>
        {devices.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Ningún dispositivo pidió avisos.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="rounded-tile border border-black/10 bg-cream p-3 text-sm"
              >
                <p className="font-semibold text-ink">{device.host}</p>
                <p className="text-xs text-muted">
                  desde {formatDate(device.createdAt)}
                  {device.lastSeenAt
                    ? ` · último aviso ${formatDate(device.lastSeenAt)}`
                    : " · todavía sin avisos"}
                </p>
                <div className="mt-2">
                  <AdminUserActions
                    kind="device"
                    userId={overview.id}
                    subscriptionId={device.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs leading-relaxed text-muted">
            Si perdió el teléfono: cerrar la sesión en todos lados. Vuelve a
            entrar con su contraseña cuando quiera; quien tenga el teléfono, no.
          </p>
          <div className="mt-2">
            <AdminUserActions kind="sessions" userId={overview.id} />
          </div>
        </div>
      </section>

      {/* I1/U6 — "perdí mis datos". */}
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Perdió sus datos</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Forzar la resincronización hace que cada teléfono de esta cuenta
          vuelva a bajar todo. Es seguro apretarlo dos veces y seguro apretarlo
          en una cuenta sana: nada de lo que esté más nuevo en el teléfono se
          pisa.
        </p>
        <div className="mt-2">
          <AdminUserActions kind="resync" userId={overview.id} />
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <h3 className="text-sm font-extrabold text-ink">
            Borrados en los últimos {RESTORE_WINDOW_DAYS} días ({tombstones.length})
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Qué tipo de registro y cuándo se borró — nunca qué decía. Al
            restaurar, el registro reaparece en un teléfono que todavía lo
            tenga guardado; el servidor no se queda con el contenido de algo
            borrado, así que no puede devolverlo por su cuenta.
          </p>
          {tombstones.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No borró nada en ese período.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {tombstones.map((row) => (
                <li
                  key={`${row.store}:${row.recordId}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0"
                >
                  <span className="text-ink">
                    {STORE_LABELS[row.store] ?? row.store}
                    <span className="ml-2 text-xs text-muted">
                      {formatDate(row.deletedAt)}
                    </span>
                  </span>
                  <AdminUserActions
                    kind="restore"
                    userId={overview.id}
                    store={row.store}
                    recordId={row.recordId}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
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
