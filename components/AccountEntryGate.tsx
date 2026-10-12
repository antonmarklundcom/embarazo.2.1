"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { db } from "@/lib/db";
import { hasPersonalSetup } from "@/lib/onboarding/hasSetup";
import { hasOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { isPublicAppPath } from "@/lib/auth/access";
import { parseAuthStatus } from "@/lib/auth/status";
import {
  ACCESS_REVOKED_EVENT, VERIFIED_KEY, bindVerifiedDeviceAccount,
  clearOfflineAccess, verifiedOfflineAccountId, rememberHandoff, rememberVerifiedAccount,
} from "@/lib/auth/access.client";

type AccessMode = "checking" | "allowed" | "offline" | "mismatch" | "unavailable";
type AccessState = { pathname: string; mode: AccessMode; accountId: string | null };

export function AccountEntryGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPage = isPublicAppPath(pathname);
  // Restore/wipe in another tab must revoke the previous grant immediately,
  // without waiting for navigation or browser focus.
  const owner = useLiveQuery(async () => (await db().syncState.get("default"))?.accountId ?? null, [], undefined);
  const [state, setState] = useState<AccessState>({ pathname, mode: "checking", accountId: null });

  useEffect(() => {
    // Old clients used a private destination after deletion; forward before an
    // account check can replace the server redirect with a generic login URL.
    if (pathname === "/ajustes" && new URLSearchParams(window.location.search).get("cuenta") === "borrada") {
      window.location.replace("/cuenta?cuenta=borrada");
      return;
    }
    if (publicPage) {
      // Returning to the same private route after public reading must not
      // reuse a grant made before a sign-out or account change.
      setState({ pathname, mode: "checking", accountId: null });
      return;
    }
    let active = true;
    let sequence = 0;
    let controller: AbortController | undefined;
    const setMode = (mode: AccessMode, accountId: string | null = null) => {
      if (active) setState({ pathname, mode, accountId });
    };
    const check = async () => {
      const checkId = ++sequence;
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      const timeout = window.setTimeout(() => requestController.abort(), 10_000);
      const current = () => active && sequence === checkId;
      setMode("checking");
      try {
        const response = await fetch("/api/v1/auth-status", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const auth = parseAuthStatus(await response.json());
        if (!current()) return;
        // Production build checks refuse this explicit local-test-preview flag.
        if (auth.accountRequired === false) { setMode("allowed"); return; }
        if (auth.signedIn && auth.accountId) {
          const ownsDevice = await bindVerifiedDeviceAccount(auth.accountId);
          if (!current()) return;
          if (!ownsDevice) { clearOfflineAccess(); setMode("mismatch"); return; }
          rememberVerifiedAccount(auth.accountId);
          const params = new URLSearchParams(window.location.search);
          const requested = params.get("continue");
          if (pathname === "/" && requested) {
            rememberHandoff(requested);
            params.delete("continue");
            window.history.replaceState({}, "", `/${params.size ? `?${params}` : ""}${window.location.hash}`);
          }
          if (pathname !== "/") {
            const profile = await db().profile.toArray();
            if (!current()) return;
            if (!hasPersonalSetup(profile.find(row => !row.deletedAt)) || hasOnboardingDraft()) {
              rememberHandoff();
              window.location.replace("/");
              return;
            }
          }
          setMode("allowed", auth.accountId);
          return;
        }
        clearOfflineAccess();
        const returnTo = rememberHandoff();
        window.location.replace(`/cuenta?returnTo=${encodeURIComponent(returnTo)}`);
      } catch {
        if (!current()) return;
        const accountId = !navigator.onLine ? await verifiedOfflineAccountId() : null;
        if (current()) setMode(accountId ? "offline" : "unavailable", accountId);
      } finally {
        window.clearTimeout(timeout);
      }
    };
    const revoke = () => { ++sequence; controller?.abort(); setMode("unavailable"); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || (event.key === VERIFIED_KEY && event.newValue === null)) revoke();
    };
    const reconnect = () => { void check(); };
    void check();
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    window.addEventListener(ACCESS_REVOKED_EVENT, revoke);
    window.addEventListener("storage", storageChanged);
    return () => {
      active = false;
      ++sequence;
      controller?.abort();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", reconnect);
      window.removeEventListener(ACCESS_REVOKED_EVENT, revoke);
      window.removeEventListener("storage", storageChanged);
    };
  }, [pathname, publicPage, owner]);

  // Neither a route change nor a local-owner change can reuse the old grant.
  const routeMode = state.pathname === pathname ? state.mode : "checking";
  const mode = state.accountId && owner !== state.accountId ? "checking" : routeMode;
  if (publicPage || mode === "allowed" || mode === "offline") {
    return <>{!publicPage && mode === "offline" && <p role="status" className="mb-3 rounded-tile bg-pastel-arena p-3 text-sm text-ink">Sin internet: estás viendo los registros guardados de tu cuenta.</p>}{children}</>;
  }
  if (mode === "checking") return <div className="py-10 text-center"><p role="status" className="text-sm text-muted">Abriendo tu embarazo…</p><Link href="/emergencia" className="mt-4 inline-block text-sm font-bold text-terracotta underline">Señales de alarma y ayuda</Link></div>;
  return (
    <section className="mx-auto my-5 max-w-md rounded-card border border-line bg-white p-5">
      <h1 className="text-xl font-black text-ink">{mode === "mismatch" ? "Este teléfono tiene datos de otra cuenta" : "No pudimos comprobar tu cuenta"}</h1>
      <p className="mt-2 text-sm text-muted">{mode === "mismatch" ? "Volvé a entrar con la cuenta de estos registros. No los vamos a mezclar ni a subir a otra persona." : "Conectate y volvé a entrar. Tus registros guardados siguen en este teléfono."}</p>
      <Link href="/cuenta" className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-petrol px-5 font-bold text-white">Ir a mi cuenta</Link>
      <Link href="/emergencia" className="mt-3 block text-sm font-bold text-terracotta underline">Señales de alarma y ayuda</Link>
    </section>
  );
}
