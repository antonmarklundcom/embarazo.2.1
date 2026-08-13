"use client";

import { useEffect } from "react";

// BUILD-PLAN C7 — count one view (feature map #16).
//
// A tiny client component rendered by content pages. It exists as a component
// rather than as a call inside the page because the guía pages are server
// components that are statically generated for offline (spec §9), and a count
// written during prerender would count the build, not a reader.
//
// It sends the content id and nothing else — no week, no session, no device.
// It never blocks or reports: a counter that shows an error to a user reading
// an article has its priorities backwards.

export function RecordContentView({ contentId }: { contentId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
      // Offline (the common case for a precached guía) rejects; that is fine.
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [contentId]);

  return null;
}
