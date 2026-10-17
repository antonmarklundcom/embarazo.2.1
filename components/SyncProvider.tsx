"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { recheckSyncSession, startSync } from "@/lib/sync/client";
import { startPhotoSync } from "@/lib/photos/client";

/**
 * BUILD-PLAN A3 — mounts the sync engine.
 *
 * It renders nothing and it asks nothing of the rest of the app. In
 * particular it does NOT need to know whether the user is signed in: finding
 * out server-side would mean reading the session cookie in a layout, which
 * would make every page dynamic and cost the 42 prerendered week pages. The
 * engine instead asks `/api/v1/auth-status` (a cheap, shared 200 answer) before
 * it ever touches `/api/v1/sync`, so a signed-out visitor on a public page
 * generates no 401. A phone that already carries a verified account goes
 * straight to sync as before. If a sign-in happens later in this tab (a soft
 * navigation does not remount this component) the route change below re-asks.
 */
export function SyncProvider() {
  useEffect(() => startSync(), []);
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    // The mount above already ran the first check; only later route changes
    // can mean "just signed in". Free when a session is already confirmed.
    if (firstPath.current === pathname) return;
    firstPath.current = pathname;
    recheckSyncSession();
  }, [pathname]);
  // F10: photo backup runs by itself too — on open and on reconnect — so a new
  // phone restores and an offline photo uploads without touching the switch.
  // It asks for nothing when backup is off and no deletion is owed.
  useEffect(() => startPhotoSync(), []);
  return null;
}
