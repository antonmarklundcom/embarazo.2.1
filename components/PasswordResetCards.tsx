"use client";

import Link from "next/link";
import { useActionState, useId } from "react";

import {
  requestPasswordResetAction,
  resetPasswordAction,
  type RequestResetState,
  type ResetPasswordState,
} from "@/app/(app)/cuenta/passwordResetActions";
import { APP_NAME } from "@/lib/brand";

// The two screens of the password-reset flow. Same design language as
// `components/SignInCard.tsx` and nothing new: cream page, white card at
// `rounded-card` with a `line` border, brand-green overline, 900-weight title,
// pill inputs at `min-h-[48px]`, `petrol` for the primary action and
// `terracotta` only for errors. No new hex values, no new radii.

/**
 * Says "si ese correo tiene una cuenta", never "te enviamos un correo".
 *
 * Those are different claims, and only the first is true for every address. The
 * server side goes to real trouble to make an unregistered address
 * indistinguishable from a registered one; a UI that confirmed delivery would
 * give the enumeration answer back in words.
 */
const SENT_MESSAGE =
  "Si ese correo tiene una cuenta, te enviamos un enlace para cambiar tu contraseña. Revisá tu correo (y la carpeta de spam). El enlace vence en 30 minutos.";

const INPUT_CLASS =
  "min-h-[48px] w-full rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-ink placeholder:text-muted/70";

const PRIMARY_CLASS =
  "flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60";

function ErrorNote({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta"
    >
      {children}
    </p>
  );
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
      {children}
    </p>
  );
}

/** `/cuenta/olvide` — ask for a link. One field, one outcome. */
export function ForgotPasswordCard({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordResetAction,
    {},
  );
  const emailId = useId();
  const errorId = useId();

  return (
    <div className="space-y-4">
      <header className="px-1">
        <Overline>Tu cuenta</Overline>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed text-muted">
          Escribí el correo con el que creaste tu cuenta y te mandamos un enlace
          para elegir una nueva contraseña.
        </p>
      </header>

      {!available ? (
        <section className="rounded-card border border-line bg-pastel-arena p-4">
          <h2 className="text-[15px] font-extrabold text-sand-text">
            Las cuentas todavía no están activas
          </h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
            En esta versión de {APP_NAME} no hay ingreso con cuenta, así que no
            hay contraseña que recuperar. La app funciona completa sin cuenta.
          </p>
        </section>
      ) : state.sent ? (
        <section className="rounded-card border border-line bg-pastel-celeste p-4">
          <h2 className="text-[15px] font-extrabold text-ink">Listo</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
            {SENT_MESSAGE}
          </p>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-white p-4 shadow-soft">
          <form action={action} className="space-y-2">
            <label htmlFor={emailId} className="sr-only">
              Correo
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
              className={INPUT_CLASS}
            />
            <button
              type="submit"
              disabled={pending}
              aria-describedby={state.error ? errorId : undefined}
              className={PRIMARY_CLASS}
            >
              {pending ? "Un momento…" : "Enviarme el enlace"}
            </button>
          </form>
          {state.error && <ErrorNote id={errorId}>{state.error}</ErrorNote>}
        </section>
      )}

      <Link
        href="/cuenta"
        className="flex min-h-[52px] w-full items-center justify-center rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99]"
      >
        Volver a entrar
      </Link>
    </div>
  );
}

/**
 * `/cuenta/restablecer` — choose a new password.
 *
 * The token arrives as a prop from the server component that read `?token=` and
 * rides in a hidden field. It is never put in a `<a href>`, never logged and
 * never echoed back into visible copy.
 */
export function ResetPasswordCard({
  token,
  available,
}: {
  token: string;
  available: boolean;
}) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {},
  );
  const passwordId = useId();
  const errorId = useId();

  const header = (
    <header className="px-1">
      <Overline>Tu cuenta</Overline>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
        Elegí una nueva contraseña
      </h1>
    </header>
  );

  // No token in the URL at all: the same dead-end message a spent or expired
  // one gets, because there is nothing useful to distinguish for the person
  // holding it — in both cases what they need is a fresh link.
  if (!available || token === "") {
    return (
      <div className="space-y-4">
        {header}
        <section className="rounded-card border border-line bg-pastel-arena p-4">
          <h2 className="text-[15px] font-extrabold text-sand-text">
            Enlace inválido o vencido
          </h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
            Este enlace no sirve para cambiar tu contraseña. Pedí uno nuevo y
            revisá tu correo.
          </p>
        </section>
        <Link href="/cuenta/olvide" className={PRIMARY_CLASS}>
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="space-y-4">
        <header className="px-1">
          <Overline>Tu cuenta</Overline>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Contraseña cambiada
          </h1>
        </header>
        <section className="rounded-card border border-line bg-pastel-celeste p-4">
          <p className="text-sm font-semibold leading-relaxed text-ink">
            Ya podés entrar con tu contraseña nueva. Por seguridad cerramos la
            sesión en todos tus dispositivos, así que vas a tener que entrar de
            nuevo en cada uno.
          </p>
        </section>
        <Link href="/cuenta" className={PRIMARY_CLASS}>
          Entrar con mi nueva contraseña
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <form action={action} className="space-y-2">
          <input type="hidden" name="token" value={token} />
          <label htmlFor={passwordId} className="sr-only">
            Nueva contraseña
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Mínimo 8 caracteres"
            className={INPUT_CLASS}
          />
          <button
            type="submit"
            disabled={pending}
            aria-describedby={state.error ? errorId : undefined}
            className={PRIMARY_CLASS}
          >
            {pending ? "Un momento…" : "Guardar la nueva contraseña"}
          </button>
        </form>
        {state.error && <ErrorNote id={errorId}>{state.error}</ErrorNote>}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          El enlace vence 30 minutos después de pedirlo y se usa una sola vez.
          Si ya venció,{" "}
          <Link href="/cuenta/olvide" className="font-bold underline">
            pedí uno nuevo
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
