import { adminDb, requireAdmin } from "@/lib/server/admin";
import { clicksByMonth } from "@/lib/server/placementClicks";
import { monthLabel, type PlacementMonth } from "@/lib/stats/placementReport";
import { getDirectory, getPlacements } from "@/lib/wordpress";

// FABLE-PLAN K15 — `/admin/patrocinios`.
//
// The question this page exists to answer, in the founder's words: **"what did
// placement X get in month Y?"** — asked by a sponsor, on the phone, who is
// deciding whether to renew. Answering it today means opening a Google Sheet
// and counting rows; answering it here takes one tap.
//
// §5 D3 scopes K15 to reporting **only**. There is no sponsor role and no
// sponsor login: this page is for the founder, and the number gets read out or
// pasted into a message. Revisit a read-only sponsor login at ~10 paying
// sponsors, not at one.
//
// ## What is deliberately not on this page
//
// **Impressions, and therefore CTR.** §6 K15 names them, and they are not here
// for a reason worth writing down rather than quietly dropping: there is no
// honest way to count them with this architecture. `/api/v1/placements` is
// cached for an hour by the browser AND precached by the service worker
// (`app/sw.ts`), which is what makes the app work offline — so a woman who
// sees a sponsor's card every day for a week generates one server request, and
// counting requests would report her as one impression. The only accurate
// alternative is a beacon fired from her device each time a card scrolls into
// view: a new write path, a new rate limit, and a new tracking surface on a
// pregnancy app, bought for a denominator.
//
// So the page reports **clicks, honestly**, and says so out loud. A sponsor
// asking for CTR gets "we don't count impressions, here is what we do count
// and why" — which is a better conversation than a number we would have to
// caveat anyway. If impressions ever matter enough to pay for, they are their
// own task with their own data-contract classification.

export const dynamic = "force-dynamic";

interface Named {
  id: string;
  label: string;
  kind: "patrocinio" | "directorio" | "desconocido";
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-muted">{children}</p>;
}

function MonthBlock({
  month,
  names,
}: {
  month: PlacementMonth;
  names: Map<string, Named>;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold capitalize text-ink">
          {monthLabel(month.month)}
        </h2>
        <p className="text-sm font-black text-ink">
          {month.total}{" "}
          <span className="text-xs font-semibold text-muted">
            {month.total === 1 ? "clic" : "clics"}
          </span>
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {month.items.map((item) => {
          const named = names.get(item.placementId);
          return (
            <li
              key={item.placementId}
              className="flex items-center justify-between gap-3 rounded-tile border border-black/10 bg-cream px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {named ? named.label : item.placementId}
                </p>
                <p className="text-[11px] text-muted">
                  {named?.kind === "directorio"
                    ? "Directorio"
                    : named?.kind === "patrocinio"
                      ? "Patrocinio"
                      : "Ya no está en el contenido"}{" "}
                  · {item.placementId}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-ink">{item.clicks}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function AdminSponsorsPage() {
  await requireAdmin();
  const database = adminDb();

  const [months, placements, directory] = await Promise.all([
    database ? clicksByMonth(database) : Promise.resolve([]),
    getPlacements(),
    getDirectory(),
  ]);

  // Ids are resolved against the content in git (§5 D4), not against a table:
  // there is no sponsors table to join, and there should not be one. An id that
  // no longer resolves is shown as exactly that rather than dropped — the
  // clicks happened, and hiding them would make a month's total not add up.
  const names = new Map<string, Named>();
  for (const placement of placements) {
    names.set(placement.id, {
      id: placement.id,
      label: placement.sponsorName,
      kind: "patrocinio",
    });
  }
  for (const listing of directory) {
    names.set(listing.id, {
      id: listing.id,
      label: listing.name,
      kind: "directorio",
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h1 className="text-lg font-black text-ink">Patrocinios</h1>
        <p className="mt-1 text-sm text-muted">
          Cuántas personas tocaron el botón de WhatsApp de cada patrocinio y de
          cada lugar del directorio, por mes.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Un clic es una persona que tocó el botón y salió hacia WhatsApp. No
          sabemos si escribió, y no sabemos quién era: la tabla guarda el aviso,
          el día y el total, y nada más — ni cuenta, ni semana, ni departamento.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          <strong>No contamos impresiones</strong>, así que tampoco hay CTR. Los
          avisos se guardan en el teléfono para que la app funcione sin
          internet, así que una mujer que ve el aviso toda la semana genera un
          solo pedido al servidor: contar pedidos daría un número falso. Si un
          patrocinador pide CTR, esto es lo que hay que contarle.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Los días se cuentan en UTC. Un clic a las 21:30 de Asunción cae en el
          día siguiente, y el último día del mes, en el mes siguiente.
        </p>
      </section>

      {!database ? (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Sin base de datos</h2>
          <Empty>
            Esta instalación corre sin <code>DATABASE_URL</code>, así que no hay
            clics guardados. La app funciona igual; el conteo no existe.
          </Empty>
        </section>
      ) : months.length === 0 ? (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-base font-extrabold text-ink">Todavía no hay clics</h2>
          <Empty>
            Cuando alguien toque el WhatsApp de un patrocinio o de un lugar del
            directorio, aparece acá. Si el directorio está vacío, primero hay
            que cargar lugares reales — ver <strong>Contenido</strong>.
          </Empty>
        </section>
      ) : (
        months.map((month) => (
          <MonthBlock key={month.month} month={month} names={names} />
        ))
      )}
    </div>
  );
}
