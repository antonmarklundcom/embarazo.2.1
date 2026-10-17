import type { Metadata } from "next";
import Link from "next/link";

import { AccountCard } from "@/components/AccountCard";
import { SignInCard } from "@/components/SignInCard";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WelcomeBaby } from "@/components/welcome/WelcomeBaby";
import { heroTheme } from "@/lib/hero/themes";
import { APP_NAME } from "@/lib/brand";
import { availableProviders, getSession, isAuthAvailable } from "@/lib/server/auth";
import { safeReturnTo, signInDestination } from "@/lib/auth/access";

// BUILD-PLAN A2 — the branded sign-in screen (ARCHITECTURE.md §6).
//
// Per-user by definition: never prerender it.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const entering = params.ingreso === "1" || Boolean(params.error) || params.cuenta === "borrada";
  return {
    title: entering ? "Tu cuenta" : "Tu embarazo, con más calma",
    description: entering
      ? `Entrá a ${APP_NAME} con Google para guardar y acompañar tu embarazo.`
      : "Información y herramientas para acompañar tu embarazo semana a semana, hechas para Paraguay.",
  };
}

/**
 * Auth.js error codes arrive as `?error=`. Translate the handful a real user
 * can actually hit; anything else gets one honest generic line rather than a
 * leaked internal code.
 */
function errorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  switch (code) {
    case "consentimiento":
      return "Necesitamos tu permiso explícito antes de crear la cuenta. Marcá la casilla y probá de nuevo.";
    case "OAuthAccountNotLinked":
      return "Ese correo ya tiene una cuenta creada con otro método. Entrá con el método que usaste la primera vez. Si usabas correo, podés recuperar tu contraseña abajo.";
    case "AccessDenied":
      return "No pudimos completar el ingreso. Probá de nuevo.";
    case "CredentialsSignin":
      return "Correo o contraseña incorrectos.";
    case "Configuration":
      return `El ingreso de ${APP_NAME} no está disponible ahora. Probá de nuevo más tarde.`;
    default:
      return "No pudimos completar el ingreso. Probá de nuevo.";
  }
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const raw = params.error;
  const destination = safeReturnTo(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo);
  const error = errorMessage(Array.isArray(raw) ? raw[0] : raw);

  if (session) {
    return (
      <div className="space-y-4">
        <header className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Tu cuenta
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Ya entraste
          </h1>
        </header>
        <AccountCard
          user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
          showDeletionNote
        />
        <Link
          href={signInDestination(destination)}
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Ir a Inicio
        </Link>
      </div>
    );
  }

  const deleted = params.cuenta === "borrada";
  // Presentation only; the original validated destination and forms are kept.
  const accountParams = new URLSearchParams({ ingreso: "1", returnTo: destination });
  const welcomeParams = new URLSearchParams({ bienvenida: "1", returnTo: destination });
  const returningParams = new URLSearchParams({ ingreso: "1", vuelvo: "1", returnTo: destination });
  const accountHref = `/cuenta?${accountParams}`;
  const returningHref = `/cuenta?${returningParams}`;
  const welcomeHref = `/cuenta?${welcomeParams}`;
  const showSignIn = params.ingreso === "1" || Boolean(error) || deleted;
  if (!showSignIn) {
    return <WelcomeScreen accountHref={accountHref} returningHref={returningHref} forceWelcome={params.bienvenida === "1"} />;
  }
  return (
    <div className="space-y-4">
      {/* The welcome's warm ground, smaller: the account step stays the focus. */}
      <div className="hero-bleed relative isolate overflow-hidden pb-2!">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: heroTheme("halo").background }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-gradient-to-b from-transparent to-cream md:hidden" />
        <Link href={welcomeHref} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/80 px-4 text-sm font-bold text-petrol underline underline-offset-4 shadow-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol"><span aria-hidden>←</span> Conocé {APP_NAME}</Link>
        <div className="-mt-2">
          <WelcomeBaby size={148} alt="" />
        </div>
      </div>
      {deleted && <section role="status" className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <h1 className="font-extrabold text-ink">Tu cuenta fue borrada</h1>
        <p className="mt-1 text-sm text-muted">El seguimiento personal necesita una cuenta. Las guías y la información de emergencia siguen disponibles.</p>
        {params.limpieza === "pendiente" && <p className="mt-2 text-sm font-semibold text-terracotta">El borrado de la cuenta se completó, pero no pudimos confirmar la limpieza de este teléfono. Cerrá la sesión y borrá los datos del sitio en tu navegador si también querés quitarlos.</p>}
        {params.local === "conservado" && <p className="mt-2 text-sm text-muted">Conservaste los registros de este teléfono, vinculados a la cuenta eliminada. No se van a mezclar con otra cuenta.</p>}
      </section>}
      <SignInCard
        providers={availableProviders()}
        credentialsAvailable={isAuthAvailable()}
        initialError={error}
        returnTo={destination}
        returning={params.vuelvo === "1"}
        compact
      />
    </div>
  );
}
