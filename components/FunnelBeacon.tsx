"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { captureLanding, flush, noteOpen, noteToolOpened } from "@/lib/stats/funnel.client";

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
  }, []);

  useEffect(() => {
    noteToolOpened(pathname);
    void flush();
  }, [pathname]);

  return null;
}
