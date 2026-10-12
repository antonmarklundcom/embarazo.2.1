"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { startSignIn, type SignInState } from "@/app/(app)/cuenta/actions";
import { PROVIDER_LABELS } from "@/lib/auth/config";
import { APP_NAME } from "@/lib/brand";
import type { AuthStatus } from "@/lib/auth/status";

import { BackButton, MARKS, PrimaryButton } from "./controls";

/**
 * Existing signed-in users continue; everyone else signs in first. The only
 * guest path is an explicitly configured local-data test preview.
 *
 * The consent checkbox is the same load-bearing control A2 built on /cuenta,
 * for the same reason (ARCHITECTURE.md §8): the server refuses a sign-in whose
 * request carries no consent ticket, and only this form can mint one.
 *
 * An invitation is redeemed by a signed-in person, with the same consent rule.
 */
export function AccountStep({
  auth,
  isLast,
  invited,
  onSkip,
  onContinue,
  onBack,
}: {
  auth: AuthStatus | null;
  isLast: boolean;
  invited: boolean;
  onSkip: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    startSignIn,
    {},
  );
  const [consented, setConsented] = useState(false);

  if (auth === null) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-sm font-extrabold text-ink">Un segundo…</p>
        <p className="mt-1 text-sm text-muted">
          Estamos viendo si podés crear tu cuenta desde acá.
        </p>
      </div>
    );
  }

  if (auth.signedIn) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">Listo, ya entraste</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {invited
            ? "Ahora sí podemos usar tu código para conectarte con quien te invitó."
            : "Tu embarazo se guarda solo y lo vas a tener de vuelta en cualquier teléfono donde entres con esta misma cuenta."}
        </p>
        <PrimaryButton
          onClick={onContinue}
          label={isLast ? "Empezar" : "Continuar"}
        />
      </div>
    );
  }

  if (auth.providers.length === 0) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">
          {auth.accountRequired ? "Entrá para continuar" : "Vista de prueba"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {auth.accountRequired
            ? "Para guardar tu embarazo y usar un código de invitación necesitás una cuenta. Conectate y abrí el ingreso; las guías y las señales de alarma siguen disponibles."
            : "Esta vista de prueba guarda los registros únicamente en este navegador."}
        </p>
        {auth.accountRequired ? (
          <Link href="/cuenta" className="mt-4 flex min-h-[48px] items-center justify-center rounded-full bg-petrol px-4 font-bold text-white">Ir al ingreso</Link>
        ) : <PrimaryButton onClick={onSkip} label="Seguir sin cuenta" />}
        <Link href="/guias" className="mt-3 block text-center text-sm font-bold text-petrol underline">Leer las guías</Link>
        <BackButton onClick={onBack} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">
          {invited ? "Entrá para usar tu código" : "Guardá tu embarazo y compartilo"}
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm font-semibold text-ink">
          {invited ? (
            <>
              <li>• Tu código te conecta con el embarazo al que te invitaron.</li>
              <li>• Vas a ver la semana, la fecha probable de parto y el próximo control.</li>
              <li>• Nunca vas a ver sus notas, sus síntomas, su peso ni sus fotos.</li>
            </>
          ) : (
            <>
              <li>• Copia de seguridad: cambiás de teléfono y está todo ahí.</li>
              <li>• Tu pareja y tu familia pueden acompañarte desde su celular.</li>
              <li>• Avisos de tu próximo control, si los querés.</li>
            </>
          )}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          De Google recibimos solo tu nombre, tu correo y tu foto de perfil.
          Nada más, nunca.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        {/* Onboarding is the one place a sign-in must come back to: `from`
            sends the user to "/" instead of /ajustes, where the saved draft
            picks the flow up again. The value is one of a closed set on the
            server — it is not a redirect target. */}
        <input type="hidden" name="from" value="onboarding" />

        <section className="rounded-card border border-line bg-pastel-celeste p-4">
          <label
            htmlFor="onboarding-consent"
            className="flex items-start gap-3 text-[15px] font-semibold leading-relaxed text-ink"
          >
            <input
              id="onboarding-consent"
              name="consent"
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink/20 accent-petrol"
            />
            <span>
              Acepto que {APP_NAME} guarde en su servidor mis datos de salud del
              embarazo (semanas, síntomas, ánimo, controles, peso) para
              sincronizarlos entre mis dispositivos.
            </span>
          </label>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink/80">
            <li>
              • Tus fotos de la panza y del carné <strong>no</strong> se suben
              con esto: quedan en tu teléfono salvo que después actives «Copia
              de tus fotos» en Ajustes.
            </li>
            <li>
              • Podés borrar tu cuenta y todos tus datos del servidor cuando
              quieras, desde Ajustes.
            </li>
            <li>• Nunca vendemos ni compartimos tus datos de salud.</li>
          </ul>
        </section>

        {[...auth.providers].sort((a, b) => Number(b === "google") - Number(a === "google")).map((id) => {
          const Mark = MARKS[id];
          return (
            <button
              key={id}
              type="submit"
              name="provider"
              value={id}
              disabled={pending || !consented}
              className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99] disabled:opacity-60"
            >
              <Mark />
              {pending ? "Abriendo…" : `Continuar con ${PROVIDER_LABELS[id]}`}
            </button>
          );
        })}

        {!consented && (
          <p className="px-1 text-xs text-muted">
            Marcá la casilla de arriba para poder crear tu cuenta.
          </p>
        )}

        {state.error && (
          <p
            role="alert"
            className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta"
          >
            {state.error}
          </p>
        )}
      </form>

      {auth.accountRequired === false && <button
        type="button"
        onClick={onSkip}
        className="min-h-[44px] w-full text-sm font-bold text-petrol underline"
      >
        {invited ? "Seguir sin cuenta (tu código queda para después)" : "Seguir sin cuenta"}
      </button>}
      <Link href="/guias" className="block min-h-[44px] py-3 text-center text-sm font-bold text-petrol underline">Leer las guías</Link>
      <BackButton onClick={onBack} />
    </div>
  );
}
