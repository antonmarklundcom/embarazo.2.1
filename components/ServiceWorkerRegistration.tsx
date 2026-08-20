"use client";

import { useEffect } from "react";

import { refreshWeeklyTips } from "@/lib/push/client";

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

  // PR-5b — top up the weekly `consejos` queue.
  //
  // Twelve weeks are enqueued at a time, so without this the tips stop for
  // anyone who has not opened Ajustes in three months. Here rather than in a
  // settings screen because it has to run for people who never visit one, and
  // it is a no-op — not even a request — for the large majority with no push
  // subscription at all.
  //
  // Outside the production guard above: the guard is about `/sw.js`, which
  // only exists in a production build. A device that already has a
  // subscription has one in every environment.
  useEffect(() => {
    void refreshWeeklyTips();
  }, []);

  return null;
}
