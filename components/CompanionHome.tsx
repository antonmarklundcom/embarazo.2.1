"use client";

import { useState } from "react";
import Link from "next/link";

import { CHEERS, type CheerId } from "@/lib/sharing/cheers";
import { canSeeSharedTasks } from "@/lib/sharing/fields";
import { sendCheer, setSharedTaskDone, type SharedView } from "@/lib/sharing/client";
import { perspectivesFor } from "@/lib/seed/perspectives";
import { CHECKLISTS } from "@/lib/checklists";

// BUILD-PLAN K2 — the companion's home screen (docs/FABLE-PLAN-2026-08.md §3).
//
// Before K2 a partner who accepted an invite saw four facts on `/familia` and
// had no reason to open the app a second time. This is the screen that gives
// them one: the week they are living through, written for *them* (C4's "para tu
// pareja" / "para la familia" band), the things they have been asked to do, and
// one tap that tells her he is there.
//
// Three rules the layout encodes:
//
//   1. **The week comes from her device, the words come from his.** The
//      snapshot carries a number; `perspectivesFor` turns it into a paragraph
//      out of the seed shipped in his own bundle. Nothing she wrote is
//      transmitted to say it.
//   2. **`family` sees the content, not the checklist.** That is
//      `canSeeSharedTasks`, and the server does not send the list either — the
//      UI is not the enforcement.
//   3. **No stale copy.** If the fetch failed there is no week to show, and the
//      screen says so instead of rendering yesterday's. See
//      `lib/sharing/useSharedViews.ts`.

const LABEL_BY_KEY = new Map(
  CHECKLISTS.flatMap((group) => group.items.map((item) => [item.key, item.label])),
);

function formatDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-PY", {
    day: "numeric",
    month: "long",
  });
}

export function CompanionHome({
  view,
  onChanged,
}: {
  view: SharedView;
  onChanged: () => void;
}) {
  const snapshot = view.snapshot;
  const week = snapshot?.week ?? null;
  const bands = week ? perspectivesFor(week) : null;
  const isPartner = view.role === "partner";
  const babyName = snapshot?.babyName;

  return (
    <div className="space-y-4">
      <header className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Estás acompañando
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
          {week ? `Semana ${week}` : "Todavía sin datos"}
        </h1>
        {babyName && (
          <p className="text-sm font-extrabold text-terracotta">{babyName}</p>
        )}
      </header>

      {!snapshot && (
        <section className="rounded-card border border-line bg-pastel-arena p-4">
          <h2 className="text-[15px] font-extrabold text-sand-text">
            Todavía no hay nada que mostrarte
          </h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
            En cuanto ella abra la app, vas a ver su semana acá. Si estás sin
            internet, probá de nuevo cuando tengas señal — no guardamos una copia
            de sus datos en tu teléfono.
          </p>
        </section>
      )}

      {snapshot && (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Fecha probable de parto</dt>
              <dd className="font-extrabold text-ink">
                {formatDate(snapshot.dueDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Próximo control</dt>
              <dd className="font-extrabold text-ink">
                {formatDate(snapshot.nextAppointmentAt)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Esto es todo lo que compartimos con vos. Sus notas, sus síntomas y
            sus fotos no salen de su teléfono.
          </p>
        </section>
      )}

      {bands && (
        <section
          aria-label="Esta semana, para vos"
          className="rounded-card border border-line bg-white p-4"
        >
          <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            {isPartner ? "Esta semana, para vos" : "Esta semana, para la familia"}
          </h2>
          <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
            {isPartner ? bands.pareja : bands.familia}
          </p>
        </section>
      )}

      <CheerButtons pregnancyId={view.pregnancyId} />

      {canSeeSharedTasks(view.role) && (
        <SharedTasks view={view} onChanged={onChanged} />
      )}

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">Y lo demás</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
          Las guías, las semanas, los derechos y los números de emergencia están
          para vos también, y funcionan sin internet.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/guias"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream px-3 text-sm font-extrabold text-petrol"
          >
            Guías
          </Link>
          <Link
            href="/emergencia"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream px-3 text-sm font-extrabold text-petrol"
          >
            Emergencia
          </Link>
          <Link
            href="/familia"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream px-3 text-sm font-extrabold text-petrol"
          >
            Familia
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * "Mandale ánimo".
 *
 * Five buttons and no text field. The message is the id of the button
 * (`lib/sharing/cheers.ts`); nothing a companion types can reach her screen,
 * which is why this feature needs no moderation and no reporting flow.
 */
function CheerButtons({ pregnancyId }: { pregnancyId: string }) {
  const [sent, setSent] = useState<CheerId | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(id: CheerId) {
    setBusy(true);
    setFailed(false);
    const ok = await sendCheer(pregnancyId, id);
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setSent(id);
  }

  return (
    <section
      aria-label="Mandale ánimo"
      className="rounded-card border border-line bg-pastel-rosa p-4"
    >
      <h2 className="text-base font-extrabold text-ink">Mandale ánimo</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/80">
        Un toque y lo ve en su pantalla de inicio. No hace falta escribir nada.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHEERS.map((cheer) => (
          <button
            key={cheer.id}
            type="button"
            disabled={busy}
            onClick={() => void send(cheer.id)}
            aria-label={`Mandar ánimo: ${cheer.buttonLabel}`}
            className={`min-h-[44px] rounded-tile px-3.5 text-sm font-extrabold transition active:scale-[0.98] disabled:opacity-60 ${
              sent === cheer.id ? "bg-petrol text-white" : "bg-white text-ink shadow-soft"
            }`}
          >
            <span aria-hidden>{cheer.emoji}</span> {cheer.buttonLabel}
          </button>
        ))}
      </div>
      {sent && (
        <p role="status" className="mt-2 text-sm font-extrabold text-petrol">
          Listo, se lo mandamos.
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-sm font-semibold text-terracotta">
          No pudimos mandarlo. ¿Tenés conexión?
        </p>
      )}
    </section>
  );
}

/**
 * The items she asked him to take care of.
 *
 * The labels are rendered from `lib/checklists.ts` on this device: the server
 * stores a key and never a sentence. A key this build does not recognise
 * renders nothing rather than a raw id.
 */
function SharedTasks({
  view,
  onChanged,
}: {
  view: SharedView;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const tasks = view.tasks ?? [];

  if (tasks.length === 0) {
    return (
      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">Tu lista</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
          Todavía no te pidió nada. Cuando marque algo «para tu pareja», te
          aparece acá.
        </p>
      </section>
    );
  }

  async function toggle(itemKey: string, done: boolean) {
    setPending(itemKey);
    await setSharedTaskDone(view.pregnancyId, itemKey, done);
    setPending(null);
    onChanged();
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-base font-extrabold text-ink">Tu lista</h2>
      <p className="mt-1 text-sm font-semibold text-muted">
        Lo que ella te pidió. Cuando marcás algo, ella lo ve.
      </p>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => {
          const label = LABEL_BY_KEY.get(task.itemKey);
          if (!label) return null;
          const done = task.doneAt !== null;
          return (
            <li key={task.itemKey}>
              <button
                type="button"
                disabled={pending === task.itemKey}
                onClick={() => void toggle(task.itemKey, !done)}
                aria-pressed={done}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-tile border border-line bg-cream px-3 py-2 text-left text-sm font-semibold text-ink disabled:opacity-60"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    done ? "border-petrol bg-petrol text-white" : "border-ink/20 bg-white"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span className={done ? "line-through opacity-60" : ""}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
