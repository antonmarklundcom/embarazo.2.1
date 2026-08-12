"use client";

import { useEffect } from "react";

import { startSync } from "@/lib/sync/client";

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
  return null;
}
