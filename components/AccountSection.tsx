import Link from "next/link";

import { AccountCard } from "@/components/AccountCard";
import { DeleteAccountCard } from "@/components/DeleteAccountCard";
import { getSession, isAuthAvailable } from "@/lib/server/auth";

// BUILD-PLAN A2 — the account block on /ajustes.
//
// Three states, and none of them is a dead end:
//   • signed in       → who you are + cerrar sesión
//   • signed out      → what an account gives you + a link to /cuenta
//   • auth unconfigured (local-only build) → say so plainly; the app is whole
//
// That last case is the one ARCHITECTURE.md §4.2 protects: with AUTH_SECRET,
// AUTH_GOOGLE_* and DATABASE_URL unset the app must still build and run, so
// this component must render something honest rather than a broken button.

export async function AccountSection() {
  const session = await getSession();

  if (session) {
    return (
      <>
        <AccountCard session={session} />
        {/* A5: deletion sits directly under the identity it deletes, so it is
            two taps from Ajustes and impossible to miss. It is deliberately
            NOT down in the "borrar todos mis datos" danger zone — that one
            wipes the phone, this one wipes the server, and conflating them is
            how a user deletes the wrong thing. */}
        <DeleteAccountCard />
      </>
    );
  }

  if (!isAuthAvailable()) {
    return (
      <section className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-[15px] font-extrabold text-ink">
          Estás usando Mi Bebé sin cuenta
        </h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
          En esta versión no hay ingreso con cuenta. Todo funciona igual y tus
          datos quedan en este teléfono — acordate de descargar tu copia de
          seguridad más abajo.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-line bg-pastel-celeste p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu cuenta
      </p>
      <h2 className="mt-1 text-[15px] font-extrabold text-ink">
        Estás usando Mi Bebé sin cuenta
      </h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
        Así está perfecto: la app funciona completa. Si querés una copia de
        seguridad automática y los mismos datos en otro aparato, podés crear una
        cuenta — tus datos de ahora se suben en ese momento.
      </p>
      <Link
        href="/cuenta"
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full bg-terracotta px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
      >
        Crear cuenta o entrar
      </Link>
    </section>
  );
}
