"use client";

import { useActionState, useState } from "react";

import {
  extendInvite,
  revokeInvite,
  supportDeleteAccount,
  supportForceResync,
  supportRemoveDevice,
  supportRestoreRecord,
  supportRevokeMembership,
  supportRevokeSessions,
  type AdminActionState,
} from "@/app/admin/actions";

// BUILD-PLAN A7 — the mutating controls.
//
// Deletion asks the administrator to type the account's email before the
// button works. A support-requested deletion is irreversible and is performed
// on somebody else's data, from a screen where the previous account is one
// browser-back away — a confirm dialog is not enough friction for that.

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return <p className="mt-2 text-sm font-semibold text-terracotta">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="mt-2 text-sm font-semibold text-sage">{state.ok}</p>;
  }
  return null;
}

function InviteActions({ code }: { code: string }) {
  const [revokeState, revokeAction, revoking] = useActionState<
    AdminActionState,
    FormData
  >(revokeInvite, {});
  const [extendState, extendAction, extending] = useActionState<
    AdminActionState,
    FormData
  >(extendInvite, {});

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <form action={extendAction}>
          <input type="hidden" name="code" value={code} />
          <button
            type="submit"
            disabled={extending}
            className="min-h-[40px] rounded-tile bg-white px-3 text-xs font-extrabold text-petrol shadow-soft disabled:opacity-60"
          >
            Reactivar 7 días
          </button>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="code" value={code} />
          <button
            type="submit"
            disabled={revoking}
            className="min-h-[40px] rounded-tile bg-white px-3 text-xs font-extrabold text-terracotta shadow-soft disabled:opacity-60"
          >
            Anular
          </button>
        </form>
      </div>
      <Feedback state={extendState} />
      <Feedback state={revokeState} />
    </div>
  );
}

function DeleteAccount({
  userId,
  email,
  recordCount,
}: {
  userId: string;
  email: string;
  recordCount: number;
}) {
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(supportDeleteAccount, {});

  const confirmed = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
      <h2 className="text-base font-extrabold text-terracotta">
        Borrar esta cuenta a pedido
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Borra del servidor los {recordCount} registros de esta cuenta, sus
        membresías, invitaciones, avisos e imágenes generadas. No se puede
        deshacer y no borra los datos del teléfono de la persona — eso lo hace
        ella desde su app. Queda registrado a tu nombre.
      </p>

      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <label
          htmlFor="confirm-email"
          className="block text-sm font-semibold text-ink"
        >
          Escribí <strong>{email}</strong> para confirmar
        </label>
        <input
          id="confirm-email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-terracotta focus:outline-none"
        />
        <button
          type="submit"
          disabled={!confirmed || pending}
          className="min-h-[44px] w-full rounded-tile bg-terracotta px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {pending ? "Borrando…" : "Borrar la cuenta"}
        </button>
      </form>
      <Feedback state={state} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// I1/U6 — the three support tickets
// ---------------------------------------------------------------------------
//
// One small button per repair rather than one "arreglar cuenta" that does
// several things. Each of these is performed on somebody else's account
// because of something they said on WhatsApp, so the administrator should be
// choosing exactly one of them and reading what it does first.
//
// None of them asks for typed confirmation, and that is deliberate: unlike
// deletion, every one is reversible or repeatable. Cutting the wrong member
// can be re-invited; a removed device re-subscribes on next open; a forced
// resync is idempotent; a restore can be re-deleted from her own phone.

function SupportButton({
  action,
  label,
  hidden,
  tone = "petrol",
}: {
  action: (state: AdminActionState, form: FormData) => Promise<AdminActionState>;
  label: string;
  /** Hidden inputs naming what is being acted on. */
  hidden: Record<string, string>;
  tone?: "petrol" | "terracotta";
}) {
  const [state, submit, pending] = useActionState<AdminActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={submit} className="inline-block">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={`min-h-[40px] rounded-tile bg-white px-3 text-xs font-extrabold shadow-soft disabled:opacity-60 ${
          tone === "terracotta" ? "text-terracotta" : "text-petrol"
        }`}
      >
        {pending ? "…" : label}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AdminUserActions(
  props:
    | { kind: "invite"; code: string }
    | { kind: "delete"; userId: string; email: string; recordCount: number }
    | { kind: "membership"; membershipId: string }
    | { kind: "device"; userId: string; subscriptionId: string }
    | { kind: "sessions"; userId: string }
    | { kind: "resync"; userId: string }
    | { kind: "restore"; userId: string; store: string; recordId: string },
) {
  if (props.kind === "invite") return <InviteActions code={props.code} />;

  if (props.kind === "membership") {
    return (
      <SupportButton
        action={supportRevokeMembership}
        label="Cortar acceso"
        tone="terracotta"
        hidden={{ id: props.membershipId }}
      />
    );
  }

  if (props.kind === "device") {
    return (
      <SupportButton
        action={supportRemoveDevice}
        label="Quitar dispositivo"
        tone="terracotta"
        hidden={{
          userId: props.userId,
          subscriptionId: props.subscriptionId,
        }}
      />
    );
  }

  if (props.kind === "sessions") {
    return (
      <SupportButton
        action={supportRevokeSessions}
        label="Cerrar sesión en todos los dispositivos"
        tone="terracotta"
        hidden={{ userId: props.userId }}
      />
    );
  }

  if (props.kind === "resync") {
    return (
      <SupportButton
        action={supportForceResync}
        label="Forzar resincronización"
        hidden={{ userId: props.userId }}
      />
    );
  }

  if (props.kind === "restore") {
    return (
      <SupportButton
        action={supportRestoreRecord}
        label="Restaurar"
        hidden={{
          userId: props.userId,
          store: props.store,
          recordId: props.recordId,
        }}
      />
    );
  }

  return (
    <DeleteAccount
      userId={props.userId}
      email={props.email}
      recordCount={props.recordCount}
    />
  );
}
