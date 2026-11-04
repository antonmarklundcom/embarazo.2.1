"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchAuthStatus } from "@/lib/auth/status";
import { inviteCodeFromSearch, inviteContinueHref } from "@/lib/sharing/inviteLink";

// Night run item 1 — the action half of `/cuenta/invitacion`.
//
// The code is read from the URL in the browser and only ever travels on: to
// `/familia?codigo=` for somebody already signed in, or through the sign-in
// screen's `returnTo` (validated by `safeReturnTo`) for somebody who is not.
// Nothing is redeemed here — the code is single-use, and a page load must not
// spend it (the rule `/familia` already follows).

type State =
  | { kind: "reading" }
  | { kind: "missing" }
  | { kind: "ready"; code: string; signedIn: boolean };

export function InviteLanding() {
  const [state, setState] = useState<State>({ kind: "reading" });

  useEffect(() => {
    const code = inviteCodeFromSearch(window.location.search);
    if (!code) {
      setState({ kind: "missing" });
      return;
    }
    let active = true;
    void fetchAuthStatus().then((auth) => {
      if (active) setState({ kind: "ready", code, signedIn: auth.signedIn });
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "missing") {
    return (
      <section role="status" className="rounded-card border border-line bg-pastel-arena p-5">
        <h2 className="text-base font-extrabold text-ink">Este enlace está incompleto</h2>
        <p className="mt-1 text-sm text-ink">
          Pedile a quien te invitó que te mande el enlace de nuevo, o el código de 10
          letras. Podés escribir el código en Familia después de entrar.
        </p>
        <Link
          href="/cuenta?ingreso=1&returnTo=%2Ffamilia"
          className="mt-3 inline-flex min-h-[48px] items-center rounded-full bg-petrol px-5 font-bold text-white"
        >
          Entrar y escribir el código
        </Link>
      </section>
    );
  }

  const href = state.kind === "ready" ? inviteContinueHref(state.code, state.signedIn) : null;
  return (
    <section className="rounded-card border border-line bg-white p-5">
      {href ? (
        <Link
          href={href}
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-petrol px-4 text-[15px] font-extrabold text-white transition active:scale-[0.99]"
        >
          {state.kind === "ready" && state.signedIn ? "Aceptar la invitación" : "Entrar para aceptar"}
        </Link>
      ) : (
        <div aria-hidden className="h-[52px] animate-pulse rounded-full bg-line/60" />
      )}
      <p className="mt-2 text-center text-xs text-muted">
        Tu código queda guardado mientras entrás. No se usa hasta que lo aceptes.
      </p>
    </section>
  );
}
