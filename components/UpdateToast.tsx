"use client";

import { useEffect, useState } from "react";

// P1.2 (BUILD-PLAN.md): Serwist uses skipWaiting+clientsClaim, so a tab left
// open across a deploy can straddle versions silently. "controllerchange"
// fires exactly when a new service worker takes control of an already-open
// client — surface a reload prompt instead of leaving the old build running.
export function UpdateToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let shown = false;
    const onControllerChange = () => {
      if (shown) return;
      shown = true;
      setVisible(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 z-50 flex items-center justify-between gap-3 rounded-tile border border-line bg-white p-3.5 shadow-soft"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      role="status"
    >
      <p className="text-sm font-semibold text-ink">
        Hay una versión nueva de la app.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-full bg-terracotta px-4 py-2 text-sm font-extrabold text-white transition active:scale-95"
      >
        Recargar
      </button>
    </div>
  );
}
