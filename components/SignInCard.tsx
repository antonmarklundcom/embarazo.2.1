"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import {
  registerWithPassword,
  signInWithPasswordAction,
  startSignIn,
  type SignInState,
} from "@/app/(app)/cuenta/actions";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/auth/config";

// BUILD-PLAN A2 — the branded sign-in screen.
//
// Design language is docs/REDESIGN-PLAN.md §1 only: cream page, white cards at
// radius 16 with a `line` border, brand-green overline, 900-weight title,
// terracotta as the single primary accent. No new hex values.
//
// Two things about the layout are requirements rather than taste:
//   1. The consent checkbox is a real control the user acts on, in its own
//      block above the buttons — not a "by continuing you agree" line under
//      them (ARCHITECTURE.md §8). PR-20 moved it outside every individual
//      `<form>` so the same tick gates Google/Facebook AND email + password;
//      each form carries it forward as a hidden field.
//   2. "Seguir sin cuenta" is a full-width button of its own with its own
//      explanation, not a grey footnote. It is a supported way to use the app
//      (ARCHITECTURE.md §4.2), so it has to look like one.

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"
      />
    </svg>
  );
}

const MARKS: Record<ProviderId, () => React.ReactElement> = {
  google: GoogleMark,
  facebook: FacebookMark,
};

/** PR-20 — the email + password block, toggling between signup and login. */
function CredentialsForms({
  consented,
  errorId,
  pendingOAuth,
}: {
  consented: boolean;
  errorId: string;
  /** True while an OAuth submit is in flight, so both paths disable together. */
  pendingOAuth: boolean;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [registerState, registerAction, registerPending] = useActionState<
    SignInState,
    FormData
  >(registerWithPassword, {});
  const [loginState, loginAction, loginPending] = useActionState<
    SignInState,
    FormData
  >(signInWithPasswordAction, {});

  const emailId = useId();
  const passwordId = useId();
  const pending = pendingOAuth || registerPending || loginPending;
  const state = mode === "register" ? registerState : loginState;
  const action = mode === "register" ? registerAction : loginAction;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-full border px-3 py-2 text-[13px] font-extrabold transition ${
            mode === "register"
              ? "border-petrol bg-petrol text-white"
              : "border-line bg-white text-muted"
          }`}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full border px-3 py-2 text-[13px] font-extrabold transition ${
            mode === "login"
              ? "border-petrol bg-petrol text-white"
              : "border-line bg-white text-muted"
          }`}
        >
          Ya tengo cuenta
        </button>
      </div>

      <form action={action} className="space-y-2">
        <input type="hidden" name="consent" value={consented ? "on" : ""} />
        <div>
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
            className="min-h-[48px] w-full rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-ink placeholder:text-muted/70"
          />
        </div>
        <div>
          <label htmlFor={passwordId} className="sr-only">
            Contraseña
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            minLength={mode === "register" ? 8 : undefined}
            required
            placeholder={
              mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"
            }
            className="min-h-[48px] w-full rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-ink placeholder:text-muted/70"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-describedby={state.error ? errorId : undefined}
          className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99] disabled:opacity-60"
        >
          {pending
            ? "Un momento…"
            : mode === "register"
              ? "Crear cuenta con correo"
              : "Entrar con correo"}
        </button>
      </form>

      {state.error && (
        <p
          id={errorId}
          role="alert"
          className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}

export function SignInCard({
  providers,
  credentialsAvailable,
  initialError,
}: {
  providers: ProviderId[];
  /** PR-20 — true once email + password sign-in can complete (secret + db). */
  credentialsAvailable: boolean;
  /** Set when the sign-in callback bounced the user back (e.g. no consent). */
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    startSignIn,
    {},
  );
  const [consented, setConsented] = useState(false);
  const consentId = useId();
  const errorId = useId();
  const credentialsErrorId = useId();

  const error = state.error ?? initialError;
  const hasAnySignIn = providers.length > 0 || credentialsAvailable;

  return (
    <div className="space-y-4">
      <header className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
          Guardá tu embarazo
        </h1>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed text-muted">
          Con una cuenta, tus datos se copian a nuestro servidor y los recuperás
          si cambiás de teléfono o lo perdés. Sin cuenta, todo sigue funcionando
          — pero vive solo en este aparato.
        </p>
      </header>

      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-[15px] font-extrabold text-ink">
          Con cuenta tenés
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm font-semibold text-ink">
          <li>• Copia de seguridad automática de tu embarazo.</li>
          <li>• Los mismos datos en el celular y en la compu.</li>
          <li>• Compartir con tu pareja o tu familia (próximamente).</li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          De Google recibimos solo tu nombre, tu correo y tu foto de perfil.
          Con correo y contraseña, solo eso: tu correo y una contraseña que
          nunca guardamos en texto plano.
        </p>
      </section>

      {!hasAnySignIn ? (
        <section className="rounded-card border border-line bg-pastel-arena p-4">
          <h2 className="text-[15px] font-extrabold text-sand-text">
            Las cuentas todavía no están activas
          </h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
            En esta versión de Mi Bebé no hay ingreso con cuenta. La app funciona
            completa igual: seguí sin cuenta y tus datos quedan en tu teléfono.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {/* The consent step. A control the user acts on, above every form. */}
          <section className="rounded-card border border-line bg-pastel-celeste p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
              Paso 1 · Tu permiso
            </p>
            <label
              htmlFor={consentId}
              className="mt-2 flex items-start gap-3 text-[15px] font-semibold leading-relaxed text-ink"
            >
              <input
                id={consentId}
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink/20 accent-petrol"
              />
              <span>
                Acepto que Mi Bebé guarde en su servidor mis datos de salud del
                embarazo (semanas, síntomas, ánimo, controles, peso) para
                sincronizarlos entre mis dispositivos.
              </span>
            </label>
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink/80">
              <li>
                • Tus fotos de la panza y del carné <strong>no</strong> se
                suben con esto: quedan en tu teléfono salvo que después
                actives «Copia de tus fotos» en Ajustes.
              </li>
              <li>
                • Podés borrar tu cuenta y todos tus datos del servidor cuando
                quieras, desde Ajustes.
              </li>
              <li>• Nunca vendemos ni compartimos tus datos de salud.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Leé la{" "}
              <Link href="/privacidad" className="font-bold underline">
                política de privacidad
              </Link>{" "}
              y los{" "}
              <Link href="/terminos" className="font-bold underline">
                términos de uso
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
              Paso 2 · Entrá
            </p>

            {providers.length > 0 && (
              <form action={formAction} className="space-y-2">
                <input
                  type="hidden"
                  name="consent"
                  value={consented ? "on" : ""}
                />
                {providers.map((id) => {
                  const Mark = MARKS[id];
                  return (
                    <button
                      key={id}
                      type="submit"
                      name="provider"
                      value={id}
                      disabled={pending}
                      aria-describedby={error ? errorId : undefined}
                      className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99] disabled:opacity-60"
                    >
                      <Mark />
                      {pending ? "Abriendo…" : `Continuar con ${PROVIDER_LABELS[id]}`}
                    </button>
                  );
                })}
                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta"
                  >
                    {error}
                  </p>
                )}
              </form>
            )}

            {providers.length > 0 && credentialsAvailable && (
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs font-bold text-muted">o con tu correo</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}

            {credentialsAvailable && (
              <CredentialsForms
                consented={consented}
                errorId={credentialsErrorId}
                pendingOAuth={pending}
              />
            )}

            {!consented && (
              <p className="px-1 text-xs text-muted">
                Marcá la casilla de arriba para poder continuar.
              </p>
            )}
          </section>
        </div>
      )}

      {/* "Seguir sin cuenta" — a supported path, given the same weight. */}
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-[15px] font-extrabold text-ink">
          ¿No querés cuenta?
        </h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
          No hace falta. Las semanas, las guías, las herramientas, el directorio
          y tu diario funcionan igual sin cuenta y sin internet. Podés crear una
          más adelante y tus datos de ahora se suben en ese momento.
        </p>
        <Link
          href="/"
          className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Seguir sin cuenta
        </Link>
      </section>
    </div>
  );
}
