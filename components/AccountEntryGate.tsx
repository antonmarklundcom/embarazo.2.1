"use client";

import { useEffect, useRef, useState } from "react";
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

type AccessMode = "checking" | "rechecking" | "allowed" | "offline" | "mismatch" | "unavailable";
type AccessState = { pathname: string; mode: AccessMode; accountId: string | null };

export function AccountEntryGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPage = isPublicAppPath(pathname);
  const privateSubtree = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
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
    // Wait for the initial ownership read before mounting private children.
    // Otherwise its undefined -> null update remounts forms after they read
    // and strip calculator fields, or while a photo input is saving.
    if (owner === undefined) return;
    let active = true;
    // Set once this page is navigating away (our own redirect, or the browser
    // unloading it). A request the browser cancels on the way out is not an
    // account problem, and must not flash "No pudimos comprobar tu cuenta" to
    // somebody who is simply being taken to the welcome screen.
    let leaving = false;
    const leave = () => { leaving = true; };
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
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && privateSubtree.current?.contains(focused)) returnFocus.current = focused;
      setState(previous => {
        const sameGrant = previous.pathname === pathname && previous.accountId === owner &&
          ["allowed", "offline", "rechecking"].includes(previous.mode);
        return sameGrant ? { ...previous, mode: "rechecking" } : { pathname, mode: "checking", accountId: null };
      });
      try {
        const response = await fetch("/api/v1/auth-status", { cache: "no-store", signal: controller.signal });
        if (!current()) return;
        if (response.status === 401 || response.status === 403) {
          leave();
          clearOfflineAccess();
          const returnTo = rememberHandoff();
          window.location.replace("/cuenta?returnTo=" + encodeURIComponent(returnTo));
          return;
        }
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
              leave();
              window.location.replace("/");
              return;
            }
          }
          setMode("allowed", auth.accountId);
          return;
        }
        // Leaving first: clearing the grant fires ACCESS_REVOKED_EVENT in this
        // tab, and `revoke` must not paint the error panel on the way out.
        leave();
        clearOfflineAccess();
        const returnTo = rememberHandoff();
        window.location.replace(`/cuenta?returnTo=${encodeURIComponent(returnTo)}`);
      } catch {
        if (!current() || leaving) return;
        // onLine only describes the network interface, not whether this server is reachable.
        // An explicit signed-out response above still revokes the grant immediately.
        const accountId = await verifiedOfflineAccountId();
        if (current()) setMode(accountId ? "offline" : "unavailable", accountId);
      } finally {
        window.clearTimeout(timeout);
      }
    };
    const revoke = () => { if (leaving) return; ++sequence; controller?.abort(); setMode("unavailable"); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || (event.key === VERIFIED_KEY && event.newValue === null)) revoke();
    };
    const reconnect = () => { if (!leaving) void check(); };
    // A page restored from the back/forward cache keeps `leaving = true` from
    // its pagehide, which used to swallow every later error and leave
    // "Abriendo tu embarazo…" on screen for good.
    const restored = (event: PageTransitionEvent) => { if (event.persisted) { leaving = false; void check(); } };
    void check();
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    window.addEventListener(ACCESS_REVOKED_EVENT, revoke);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restored);
    return () => {
      active = false;
      ++sequence;
      controller?.abort();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", reconnect);
      window.removeEventListener(ACCESS_REVOKED_EVENT, revoke);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restored);
    };
  }, [pathname, publicPage, owner]);

  // Neither a route change nor a local-owner change can reuse the old grant.
  const routeMode = state.pathname === pathname ? state.mode : "checking";
  const mode = state.accountId && owner !== state.accountId ? "checking" : routeMode;

  useEffect(() => {
    if (mode === "allowed" || mode === "offline") {
      const element = returnFocus.current;
      returnFocus.current = null;
      if (element?.isConnected && privateSubtree.current?.contains(element)) element.focus({ preventScroll: true });
    } else if (mode !== "rechecking") { returnFocus.current = null; }
  }, [mode]);

  // Never an endless "Abriendo…": after 12 s of checking, offer a retry and
  // the repair page instead of a screen that looks frozen.
  const [slow, setSlow] = useState(false);
  const stuck = !publicPage && (mode === "checking" || mode === "rechecking");
  useEffect(() => {
    if (!stuck) { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [stuck, pathname]);
  if (publicPage) return <>{children}</>;
  if (mode === "allowed" || mode === "offline" || mode === "rechecking") {
    // Keep the same child position and wrapper during a same-owner check. Hidden/inert
    // locks interaction without destroying unsaved component state. Revocation and
    // owner changes take the other branches below and immediately unmount it.
    return <>
      {mode === "offline" ? <p role="status" className="mb-3 rounded-tile bg-pastel-arena p-3 text-sm text-ink">Sin internet: estás viendo los registros guardados de tu cuenta.</p>
        : mode === "rechecking" ? <section className="mb-3 rounded-tile border border-line p-3 text-sm text-muted">
          <p role="status">{slow ? "La comprobación está tardando. Tus cambios sin guardar siguen en esta pantalla." : "Comprobando tu cuenta…"}</p>
          {slow && <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="min-h-11 font-bold text-petrol underline" onClick={() => window.dispatchEvent(new Event("focus"))}>Volver a comprobar</button>
            <a href="/reparar" className="inline-flex min-h-11 items-center font-bold text-petrol underline">Reparar la app</a>
            <Link href="/emergencia" className="inline-flex min-h-11 items-center font-bold text-terracotta underline">Señales de alarma y ayuda</Link>
          </div>}
        </section> : null}
      <div ref={privateSubtree} hidden={mode === "rechecking"} inert={mode === "rechecking"}>{children}</div>
    </>;
  }
  if (mode === "checking" && slow) return (
    <section className="mx-auto my-5 max-w-md rounded-card border border-line bg-white p-5">
      <h1 className="text-xl font-black text-ink">Está tardando más de lo normal</h1>
      <p className="mt-2 text-sm text-muted">Probá de nuevo. Si sigue igual, repará la app: tus registros guardados en este teléfono no se borran.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-petrol px-5 font-bold text-white">Reintentar</button>
      <a href="/reparar" className="mt-3 block text-sm font-bold text-petrol underline">Reparar la app</a>
      <Link href="/emergencia" className="mt-3 block text-sm font-bold text-terracotta underline">Señales de alarma y ayuda</Link>
    </section>
  );
  // The server-rendered placeholder. If the app's JavaScript never starts (an
  // old cached page naming deleted files), the repair link still appears after
  // 10 s through CSS alone.
  if (mode === "checking") return <div className="py-10 text-center"><p role="status" className="text-sm text-muted">Abriendo tu embarazo…</p><Link href="/emergencia" className="mt-4 inline-block text-sm font-bold text-terracotta underline">Señales de alarma y ayuda</Link><p className="reveal-late mt-6 text-sm text-muted">¿No carga? <a href="/reparar" className="font-bold text-petrol underline">Reparar la app</a></p></div>;
  return (
    <section className="mx-auto my-5 max-w-md rounded-card border border-line bg-white p-5">
      <h1 className="text-xl font-black text-ink">{mode === "mismatch" ? "Este teléfono tiene datos de otra cuenta" : "No pudimos comprobar tu cuenta"}</h1>
      <p className="mt-2 text-sm text-muted">{mode === "mismatch" ? "Volvé a entrar con la cuenta de estos registros. No los vamos a mezclar ni a subir a otra persona." : owner ? "Conectate y volvé a entrar. Tus registros guardados siguen en este teléfono." : "Conectate a internet y probá de nuevo."}</p>
      <Link href="/cuenta" className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-petrol px-5 font-bold text-white">Ir a mi cuenta</Link>
      <Link href="/emergencia" className="mt-3 block text-sm font-bold text-terracotta underline">Señales de alarma y ayuda</Link>
    </section>
  );
}
