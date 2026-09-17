"use client";

import Link from "next/link";
import { useActionState, useId } from "react";

import {
  resendVerificationAction,
  verifyEmailAction,
  type ResendVerificationState,
  type VerifyEmailState,
} from "@/app/(app)/cuenta/verificar/actions";
import { APP_NAME } from "@/lib/brand";

// `/cuenta/verificar` — the one screen of the email-confirmation flow.
//
// Same design language as `components/PasswordResetCards.tsx` and nothing new:
// cream page, white card at `rounded-card` with a `line` border, brand-green
// overline, 900-weight title, `petrol` for the primary action and `terracotta`
// only for errors. No new hex values, no new radii.
//
// The tone is the load-bearing part. Confirming is NOT required to use the app —
// `authorize()` does not check `emailVerified` — so every string here is a
// nudge. Nothing on this screen says "tenés que", and the unconfirmed state says
// out loud that the account works either way. A screen that implied otherwise
// would be lying to every user who signed up before this feature existed.

const PRIMARY_CLASS =
  "flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60";

const SECONDARY_CLASS =
  "flex min-h-[52px] w-full items-center justify-center rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99] disabled:opacity-60";

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

function Header({ title }: { title: string }) {
  return (
    <header className="px-1">
      <Overline>Tu cuenta</Overline>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
        {title}
      </h1>
    </header>
  );
}

/**
 * The "pedime otro" block. Only offered to a signed-in user, because the action
 * takes its address from the session and never from a field — see the note on
 * `resendVerificationAction`.
 */
function ResendBlock({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendVerificationAction, {});
  const errorId = useId();

  if (!signedIn) {
    return (
      <p className="px-1 text-sm font-semibold leading-relaxed text-muted">
        Entrá a tu cuenta y volvé a esta pantalla para pedir un enlace nuevo.
      </p>
    );
  }

  if (state.sent) {
    return (
      <section className="rounded-card border border-line bg-pastel-celeste p-4">
        <p className="text-sm font-semibold leading-relaxed text-ink">
          Te mandamos un enlace nuevo. Revisá tu correo (y la carpeta de spam).
          Vence en 24 horas.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          aria-describedby={state.error ? errorId : undefined}
          className={SECONDARY_CLASS}
        >
          {pending ? "Un momento…" : "Mandame el enlace de nuevo"}
        </button>
      </form>
      {state.error && <ErrorNote id={errorId}>{state.error}</ErrorNote>}
    </div>
  );
}

export function VerifyEmailCard({
  token,
  available,
  signedIn,
  verified,
}: {
  /** The raw `?token=`, or "" when there is none (or auth is off). */
  token: string;
  available: boolean;
  signedIn: boolean;
  /** Whether this account's address is already confirmed. */
  verified: boolean;
}) {
  const [state, action, pending] = useActionState<VerifyEmailState, FormData>(
    verifyEmailAction,
    {},
  );
  const errorId = useId();

  if (!available) {
    return (
      <div className="space-y-4">
        <Header title="Confirmá tu correo" />
        <section className="rounded-card border border-line bg-pastel-arena p-4">
          <h2 className="text-[15px] font-extrabold text-sand-text">
            Las cuentas todavía no están activas
          </h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
            En esta versión de {APP_NAME} no hay ingreso con cuenta, así que no
            hay correo que confirmar. La app funciona completa sin cuenta.
          </p>
        </section>
        <Link href="/ajustes" className={PRIMARY_CLASS}>
          Volver a ajustes
        </Link>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="space-y-4">
        <Header title="Tu correo está confirmado" />
        <section className="rounded-card border border-line bg-pastel-celeste p-4">
          <p className="text-sm font-semibold leading-relaxed text-ink">
            Listo, ya sabemos que este correo es tuyo. Si algún día olvidás tu
            contraseña, podemos mandarte un enlace para entrar de nuevo.
          </p>
        </section>
        <Link href="/ajustes" className={PRIMARY_CLASS}>
          Volver a ajustes
        </Link>
      </div>
    );
  }

  // No token in the URL: somebody landed here on purpose. Say where the address
  // stands and, if it is not confirmed yet, offer the mail again.
  if (token === "") {
    return (
      <div className="space-y-4">
        <Header
          title={verified ? "Tu correo está confirmado" : "Confirmá tu correo"}
        />
        {verified ? (
          <section className="rounded-card border border-line bg-pastel-celeste p-4">
            <p className="text-sm font-semibold leading-relaxed text-ink">
              Ya confirmaste el correo de tu cuenta. No hace falta hacer nada
              más.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-card border border-line bg-white p-4 shadow-soft">
              <p className="text-sm font-semibold leading-relaxed text-ink">
                Para confirmar tu correo, abrí el enlace que te mandamos cuando
                creaste tu cuenta.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Confirmar es opcional: tu cuenta y la app funcionan igual. Sirve
                para que podamos ayudarte a entrar si olvidás tu contraseña.
              </p>
            </section>
            <ResendBlock signedIn={signedIn} />
          </>
        )}
        <Link href="/ajustes" className={SECONDARY_CLASS}>
          Volver a ajustes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header title="Confirmá tu correo" />
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <form action={action}>
          {/* The token rides in a hidden field and is spent only when this is
              submitted, so a link-preview bot opening the URL cannot consume
              it. It is never rendered as text and never put in an href. */}
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            disabled={pending}
            aria-describedby={state.error ? errorId : undefined}
            className={PRIMARY_CLASS}
          >
            {pending ? "Un momento…" : "Confirmar mi correo"}
          </button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          El enlace vence 24 horas después de que lo pedimos y se usa una sola
          vez.
        </p>
      </section>
      {state.error && (
        <>
          <ErrorNote id={errorId}>{state.error}</ErrorNote>
          <ResendBlock signedIn={signedIn} />
        </>
      )}
      <Link href="/ajustes" className={SECONDARY_CLASS}>
        Volver a ajustes
      </Link>
    </div>
  );
}
