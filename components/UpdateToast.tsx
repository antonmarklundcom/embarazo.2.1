"use client";

import { useEffect, useState } from "react";

// PWA update toast (build plan P1.2). The service worker uses
// skipWaiting:true, so a new worker activates as soon as it installs. When it
// takes control mid-session, a client can be running stale code — we surface
// a gentle "recargar" prompt instead of leaving the user on the old version.
export function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // The first controller (initial SW claim on a fresh load) is not an
    // "update" — only show the toast when the controller changes after the
    // page already had one.
    let hadController = !!navigator.serviceWorker.controller;
    const onChange = () => {
      if (hadController) setShow(true);
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card bg-ink px-4 py-3 text-sm text-white shadow-soft"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <span>Hay una versión nueva de la app.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-medium transition active:scale-95"
      >
        Recargar
      </button>
    </div>
  );
}
