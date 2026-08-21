import { requireAdmin } from "@/lib/server/admin";
import { collectionDebt, weekRenderDebt } from "@/lib/server/contentDebt";
import {
  debtAction,
  sortedByDebt,
  totalHidden,
  type CollectionDebt,
} from "@/lib/content/reviewDebt";

// FABLE-PLAN §5 D4 — `/admin/contenido`, the review-debt page.
//
// D4 declined an editor role and settled that content stays in git. What it
// promised instead was this: a **read-only** page saying what the app is
// hiding and why.
//
// It exists because the gates are silent. `publishedOnly` hides an invented
// sanatorio with a dead +595 number, `reviewedOnly` hides a price nobody has
// signed off, and both of them do it without saying a word — the screen simply
// renders its empty state, which K18 made honest but which still cannot tell
// the founder that eleven real listings would light it up. Roughly a fifth of
// the navigation is in that condition today.
//
// There is deliberately **no button on this page**. No approve, no publish, no
// override. An entry lights up when somebody edits the JSON in git and it
// stops looking like a placeholder — a page that could publish content would
// be the editor role D4 declined, arriving through the back door, and it would
// also mean content that was never validated at build time (G1) and never
// entered the service worker's precache, which is most of what makes this app
// work on a bus.

export const dynamic = "force-dynamic";

function Bar({ row }: { row: CollectionDebt }) {
  const pct = row.total === 0 ? 0 : Math.round((row.published / row.total) * 100);
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
      <div
        className={pct === 0 ? "h-full bg-terracotta" : "h-full bg-petrol"}
        style={{ width: `${Math.max(pct, row.published > 0 ? 4 : 100)}%` }}
      />
    </div>
  );
}

function Row({ row }: { row: CollectionDebt }) {
  const hidden = row.placeholder + row.unreviewed + row.both;
  return (
    <li className="rounded-tile border border-black/10 bg-cream p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold text-ink">{row.label}</p>
        <p className="shrink-0 text-sm font-black text-ink">
          {row.published}
          <span className="text-xs font-semibold text-muted"> / {row.total}</span>
        </p>
      </div>
      <p className="text-[11px] text-muted">{row.surface}</p>
      <Bar row={row} />
      {hidden > 0 && (
        <p className="mt-2 text-xs text-ink">
          {debtAction(row)}{" "}
          <span className="text-muted">
            (
            {[
              row.placeholder > 0 ? `${row.placeholder} sin datos reales` : null,
              row.unreviewed > 0 ? `${row.unreviewed} sin firmar` : null,
              row.both > 0 ? `${row.both} sin datos y sin firmar` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            )
          </span>
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted">
        <code>{row.file}</code>
      </p>
    </li>
  );
}

export default async function AdminContentPage() {
  await requireAdmin();

  const rows = sortedByDebt(collectionDebt());
  const hidden = totalHidden(rows);
  const weeks = weekRenderDebt();
  const dark = rows.filter((row) => row.published === 0);

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h1 className="text-lg font-black text-ink">Contenido</h1>
        <p className="mt-1 text-sm text-muted">
          Qué está publicado, qué está escondido y por qué. Esta página no
          publica nada: el contenido vive en el repositorio y se publica
          editando el archivo.
        </p>
        <div className="mt-3 flex gap-6">
          <div>
            <p className="text-2xl font-black text-ink">{hidden}</p>
            <p className="text-xs font-semibold text-muted">entradas escondidas</p>
          </div>
          <div>
            <p className="text-2xl font-black text-ink">{dark.length}</p>
            <p className="text-xs font-semibold text-muted">
              pantallas sin nada que mostrar
            </p>
          </div>
        </div>
        {dark.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Una pantalla vacía no está rota: los filtros esconden negocios
            inventados con números que no contestan, y precios que ninguna
            revisora firmó. Se llena sola cuando llegan datos reales — no hay
            que tocar código.
          </p>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Colecciones</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Las que están completamente vacías van primero.
        </p>
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <Row key={row.file} row={row} />
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Imágenes semanales</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          <code>public/assets/semanas/bebe-&lt;semana&gt;.webp</code>. Es la
          imagen más grande de la pantalla de inicio: cada semana que falta es
          una pantalla más lenta en un celular de gama media, y la mujer ve un
          bloque de color con el número en lugar de su bebé.
        </p>
        <p className="mt-3 text-2xl font-black text-ink">
          {weeks.present}
          <span className="text-sm font-semibold text-muted"> / {weeks.total}</span>
        </p>
        {weeks.missingSample.length > 0 && (
          <p className="mt-1 text-xs text-muted">
            Faltan, empezando por: semanas {weeks.missingSample.join(", ")}
            {weeks.present + weeks.missingSample.length < weeks.total ? "…" : ""}
          </p>
        )}
      </section>
    </div>
  );
}
