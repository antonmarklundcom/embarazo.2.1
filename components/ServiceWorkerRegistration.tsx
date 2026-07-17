"use client";

import { useEffect } from "react";

// next.config.ts builds public/sw.js in production only (Serwist is
// disabled in dev) but @serwist/next never registers it automatically —
// without this call the SW never installs and the offline/precache
// promise (build spec §9) is inert. Registration itself is one line;
// UpdateToast listens for the resulting "controllerchange" event.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort: the app works fully online without it.
    });
  }, []);
  return null;
}
