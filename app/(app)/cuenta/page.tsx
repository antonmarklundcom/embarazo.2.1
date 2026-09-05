import type { Metadata } from "next";
import Link from "next/link";

import { AccountCard } from "@/components/AccountCard";
import { SignInCard } from "@/components/SignInCard";
import { availableProviders, getSession, isAuthAvailable } from "@/lib/server/auth";

// BUILD-PLAN A2 — the branded sign-in screen (ARCHITECTURE.md §6).
//
// Per-user by definition: never prerender it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu cuenta",
  description:
    "Creá una cuenta para guardar tu embarazo, o seguí usando Mi Bebé sin cuenta.",
};

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
      return "Ese correo ya tiene una cuenta creada con otro método. Entrá con el método que usaste la primera vez.";
    case "AccessDenied":
      return "No pudimos completar el ingreso. Probá de nuevo o seguí sin cuenta.";
    case "CredentialsSignin":
      return "Correo o contraseña incorrectos.";
    case "Configuration":
      return "El ingreso con cuenta no está bien configurado en este servidor. Podés seguir usando Mi Bebé sin cuenta.";
    default:
      return "No pudimos completar el ingreso. Probá de nuevo o seguí sin cuenta.";
  }
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const raw = (await searchParams).error;
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
        <AccountCard session={session} showDeletionNote />
        <Link
          href="/"
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
        >
          Ir a Inicio
        </Link>
      </div>
    );
  }

  return (
    <SignInCard
      providers={availableProviders()}
      credentialsAvailable={isAuthAvailable()}
      initialError={error}
    />
  );
}
