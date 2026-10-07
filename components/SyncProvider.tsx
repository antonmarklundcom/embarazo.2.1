"use client";

import { useEffect } from "react";

import { startSync } from "@/lib/sync/client";
import { startPhotoSync } from "@/lib/photos/client";

/**
 * BUILD-PLAN A3 — mounts the sync engine.
 *
 * It renders nothing and it asks nothing of the rest of the app. In
 * particular it does NOT need to know whether the user is signed in: finding
 * out server-side would mean reading the session cookie in a layout, which
 * would make every page dynamic and cost the 42 prerendered week pages. The
 * engine instead makes one request, and a 401 or 404 tells it to stand down
 * for the rest of the page load — which is exactly what "seguir sin cuenta"
 * looks like from here.
 */
export function SyncProvider() {
  useEffect(() => startSync(), []);
  // F10: photo backup runs by itself too — on open and on reconnect — so a new
  // phone restores and an offline photo uploads without touching the switch.
  // It asks for nothing when backup is off and no deletion is owed.
  useEffect(() => startPhotoSync(), []);
  return null;
}
