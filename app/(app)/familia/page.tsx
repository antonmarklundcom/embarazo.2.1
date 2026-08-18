"use client";

import { useCallback, useEffect, useState } from "react";

import {
  acceptInviteCode,
  assignTaskToPartner,
  createInviteCode,
  fetchSharedViews,
  publishCompanionSnapshot,
  revokeMember,
  unassignTaskFromPartner,
  type SharedView,
} from "@/lib/sharing/client";
import { CHECKLISTS } from "@/lib/checklists";
import { SharingLevels } from "@/components/SharingLevels";
import { isValidInviteCode } from "@/lib/sharing/fields";
import { inviteCodeFromSearch } from "@/lib/sharing/inviteLink";

// BUILD-PLAN E1 — one screen, both sides of sharing.
//
// The owner sees: who can see their pregnancy, and a code to invite somebody.
// A companion sees: the week, the due date and the next control. Nothing else
// exists to show them — the server has nothing else to give (see
// `companionSnapshots` in lib/server/schema.ts).

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function FamiliaPage() {
  const [views, setViews] = useState<SharedView[] | null>(null);
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<{ code: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);

  const reload = useCallback(async () => {
    setViews(await fetchSharedViews());
  }, []);

  useEffect(() => {
    // Publishing on open keeps the companion view fresh without a background
    // job: the owner opening the app is the only reliable moment we have.
    void publishCompanionSnapshot().then(reload);
  }, [reload]);

  // K1: an invitation now travels as a link (`/familia?codigo=…`), so somebody
  // arriving from WhatsApp lands here with their code already in hand. It is
  // filled in, **not** redeemed automatically: the code is single-use, and
  // spending it on a page load would burn it for whoever opened the message by
  // accident. `window.location` rather than `useSearchParams` keeps this page
  // out of a Suspense boundary it does not otherwise need.
  useEffect(() => {
    const fromLink = inviteCodeFromSearch(window.location.search);
    if (!fromLink) return;
    setCode(fromLink);
    setInvited(true);
  }, []);

  const owned = views?.find((v) => v.role === "owner");
  const shared = views?.filter((v) => v.role !== "owner") ?? [];

  async function onInvite(role: "partner" | "family") {
    setBusy(true);
    setMessage("");
    const created = await createInviteCode(role);
    setBusy(false);
    if (!created) {
      setMessage("No pudimos crear el código. ¿Tenés conexión?");
      return;
    }
    setInvite(created);
    await reload();
  }

  async function onAccept() {
    const value = code.trim().toUpperCase();
    setMessage("");
    if (!isValidInviteCode(value)) {
      setMessage("Ese código no parece válido. Fijate que esté completo.");
      return;
    }
    setBusy(true);
    const result = await acceptInviteCode(value);
    setBusy(false);
    if (result.ok) {
      setCode("");
      await reload();
      return;
    }
    setMessage(
      result.reason === "expired"
        ? "Ese código venció. Pedile uno nuevo."
        : result.reason === "used"
          ? "Ese código ya fue usado por otra persona."
          : "No encontramos ese código.",
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Familia</h1>
        <p className="text-sm text-muted">
          Compartí tu semana con quien quieras, sin compartir todo lo demás.
        </p>
      </header>

      {shared.map((view) => (
        <section
          key={view.pregnancyId}
          className="rounded-card bg-white p-4 shadow-soft"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Estás acompañando
          </p>
          <h2 className="mt-1 text-xl font-black text-ink">
            {view.snapshot?.week
              ? `Semana ${view.snapshot.week}`
              : "Todavía sin datos"}
          </h2>
          {view.snapshot?.babyName && (
            <p className="text-sm font-bold text-terracotta">
              {view.snapshot.babyName}
            </p>
          )}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Fecha probable de parto</dt>
              <dd className="font-semibold text-ink">
                {formatDate(view.snapshot?.dueDate ?? null)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Próximo control</dt>
              <dd className="font-semibold text-ink">
                {formatDate(view.snapshot?.nextAppointmentAt ?? null)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Esto es todo lo que compartimos con vos. Sus notas, sus síntomas y
            sus fotos no salen de su teléfono.
          </p>
        </section>
      ))}

      {owned && <SharingLevels onChanged={() => void reload()} />}

      {owned && <PartnerTasks view={owned} onChanged={reload} />}

      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Invitar a alguien
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Van a ver tu semana, tu fecha probable de parto y tu próximo control.
          <strong> No van a ver</strong> tus notas, tus síntomas, tu peso ni tus
          fotos.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onInvite("partner")}
            className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 text-sm font-extrabold text-white disabled:opacity-60"
          >
            Mi pareja
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onInvite("family")}
            className="min-h-[44px] flex-1 rounded-tile bg-cream px-4 text-sm font-extrabold text-petrol disabled:opacity-60"
          >
            Familia o amiga
          </button>
        </div>

        {invite && (
          <div className="mt-3 rounded-tile bg-pastel-salvia p-3">
            <p className="text-xs text-ink">Pasale este código:</p>
            <p className="mt-1 text-2xl font-black tracking-[3px] text-ink">
              {invite.code}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Sirve una sola vez y vence en 14 días.
            </p>
          </div>
        )}

        {owned?.members && owned.members.length > 1 && (
          <>
            <h3 className="mt-4 text-sm font-extrabold text-ink">
              Quién ve tu embarazo
            </h3>
            <ul className="mt-2 space-y-2">
              {owned.members
                .filter((m) => m.role !== "owner")
                .map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center justify-between gap-2 rounded-tile border border-black/10 bg-cream p-3 text-sm"
                  >
                    <span className="text-ink">{member.role}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await revokeMember(owned.pregnancyId, member.userId);
                        await reload();
                      }}
                      className="min-h-[40px] rounded-tile bg-white px-3 text-xs font-extrabold text-terracotta shadow-soft"
                    >
                      Quitar acceso
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">
          Tengo un código
        </h2>
        <p className="mt-1 text-sm text-muted">
          {invited
            ? "Te invitaron a acompañar un embarazo. Tocá «Entrar» para aceptar — el código sirve una sola vez."
            : "Si alguien te invitó a acompañar su embarazo, escribí su código acá."}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD234XYZ"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 text-sm tracking-[2px] focus:border-petrol focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void onAccept()}
            className="min-h-[44px] rounded-tile bg-petrol px-4 text-sm font-extrabold text-white disabled:opacity-60"
          >
            Entrar
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-terracotta">{message}</p>}
      </section>
    </div>
  );
}

/**
 * K2 — "para tu pareja": the owner's half of the shared checklist.
 *
 * She ticks an item here and it appears on his home screen; when he marks it
 * done she sees it here. What travels is the item's **key** — the words are
 * rendered from `lib/checklists.ts` on both devices, so nothing she types can
 * reach the server and no free-text channel exists between the two of them
 * (see lib/sharing/cheers.ts for the same argument about ánimos).
 *
 * The section renders for the owner only. `family` members never see it, and
 * the server does not send them the list either — this is presentation, not
 * enforcement.
 */
function PartnerTasks({
  view,
  onChanged,
}: {
  view: SharedView;
  onChanged: () => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const assigned = new Map((view.tasks ?? []).map((task) => [task.itemKey, task]));

  async function toggle(itemKey: string) {
    setPending(itemKey);
    if (assigned.has(itemKey)) await unassignTaskFromPartner(itemKey);
    else await assignTaskToPartner(itemKey);
    await onChanged();
    setPending(null);
  }

  const doneCount = [...assigned.values()].filter((t) => t.doneAt !== null).length;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Para tu pareja</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Marcá lo que querés que se encargue él. Le aparece en su pantalla de
        inicio y vos ves acá cuando lo hace. Solo tu pareja ve esta lista — la
        familia no.
      </p>
      {assigned.size > 0 && (
        <p className="mt-2 text-sm font-extrabold text-petrol">
          {doneCount} de {assigned.size} listo{assigned.size === 1 ? "" : "s"}
        </p>
      )}

      {CHECKLISTS.map((group) => (
        <div key={group.id} className="mt-3">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-muted">
            {group.title}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {group.items.map((item) => {
              const task = assigned.get(item.key);
              const isAssigned = task !== undefined;
              const isDone = task?.doneAt != null;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    disabled={pending === item.key}
                    onClick={() => void toggle(item.key)}
                    aria-pressed={isAssigned}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-tile border px-3 py-2 text-left text-sm font-semibold disabled:opacity-60 ${
                      isAssigned
                        ? "border-petrol/30 bg-pastel-salvia text-ink"
                        : "border-line bg-cream text-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
                        isAssigned
                          ? "border-petrol bg-petrol text-white"
                          : "border-ink/20 bg-white"
                      }`}
                    >
                      {isAssigned ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {isDone && (
                      <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-[1px] text-petrol">
                        Hecho
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
