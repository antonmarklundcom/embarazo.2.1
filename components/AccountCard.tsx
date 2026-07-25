"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

interface AuthStatus {
  enabled: boolean;
  providers: string[];
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/v1/auth/status");
  if (!res.ok) throw new Error("failed");
  return (await res.json()) as AuthStatus;
}

// BUILD-PLAN A2. The account section of Ajustes.
//
// Three states, and all three are legitimate — none of them is an error:
//   • accounts not available in this deployment → say nothing about accounts
//   • available, not signed in → offer it, honestly, without nagging
//   • signed in → show who, and how to leave
//
// The split below is deliberate: `useSession()` triggers a network call, and in
// local-only mode there is no session to fetch and no point asking. So the
// hook lives in an inner component that only mounts once we know accounts
// exist here.
export function AccountCard() {
  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: fetchAuthStatus,
    staleTime: 1000 * 60 * 5,
  });

  if (!authStatus?.enabled) return null;
  return <SignedInOrOut />;
}

function SignedInOrOut() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-24 animate-pulse rounded-card bg-black/5" />;
  }

  if (!session?.user) {
    return (
      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-[15px] font-extrabold text-ink">Tu cuenta</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Sin cuenta, tus datos viven solo en este teléfono. Si lo perdés o
          borrás la app, se pierden. Con cuenta, los recuperás entrando de
          nuevo.
        </p>
        <Link
          href="/entrar"
          className="mt-3 flex min-h-[48px] items-center justify-center rounded-full bg-terracotta px-5 text-sm font-extrabold text-white transition active:scale-[0.98]"
        >
          Crear cuenta o entrar
        </Link>
        <p className="mt-2 text-xs text-muted">
          Tus fotos nunca se suben, tengas cuenta o no.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="text-[15px] font-extrabold text-ink">Tu cuenta</h2>
      <p className="mt-1 text-sm text-muted">
        {session.user.email ?? session.user.name ?? "Sesión iniciada"}
      </p>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="min-h-[48px] w-full rounded-tile border border-line bg-cream px-4 text-sm font-extrabold text-petrol transition active:scale-[0.98]"
        >
          Cerrar sesión
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Cerrar sesión no borra nada. Tus datos quedan en este teléfono y en tu
          cuenta.
        </p>
      </div>
    </section>
  );
}
