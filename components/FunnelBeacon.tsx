"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { captureLanding, flush, noteInstall, noteOpen, noteToolOpened } from "@/lib/stats/funnel.client";
import { isInsideTwa, isStandalone } from "@/lib/useInstallPrompt";

// Growth plan items 16–18 — the device half of the install funnel, mounted
// once in the app shell. Renders nothing.
//
// `useLayoutEffect` for the landing read, and it is load-bearing: the home
// page strips the site's params from the URL in its own (passive) effect, and
// children's effects run before their parent's. Layout effects all run before
// any passive effect, so the landing URL is read while it is still intact.
export function FunnelBeacon() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    captureLanding(window.location.search);
    noteOpen();
    // Night run item 3 — opened from the home-screen icon or the Play wrapper.
    if (isStandalone() || isInsideTwa()) noteInstall("standalone");
  }, []);

  useEffect(() => {
    noteToolOpened(pathname);
    void flush();
  }, [pathname]);

  return null;
}
