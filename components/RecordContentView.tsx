"use client";

import { useEffect } from "react";

import { useProfile } from "@/lib/useProfile";

// BUILD-PLAN C7 — count one view (feature map #16).
//
// A tiny client component rendered by content pages. It exists as a component
// rather than as a call inside the page because the guía pages are server
// components that are statically generated for offline (spec §9), and a count
// written during prerender would count the build, not a reader.
//
// K5: it sends the content id and the reader's pregnancy week — no session, no
// device id, nothing else. The week is read from the local profile, so a reader
// who has none (planeando mode, a companion, somebody who has not onboarded)
// sends the id alone and is counted in the "no week" bucket.
//
// It never blocks or reports: a counter that shows an error to a user reading
// an article has its priorities backwards.

export function RecordContentView({ contentId }: { contentId: string }) {
  const profile = useProfile();
  const week = profile.week;

  useEffect(() => {
    // Wait for the profile read rather than firing twice or firing weekless.
    // A view counted in the wrong bucket is worse than a view counted a
    // half-second later.
    if (profile.loading) return;
    const controller = new AbortController();
    void fetch("/api/v1/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        typeof week === "number" ? { contentId, week } : { contentId },
      ),
      // Offline (the common case for a precached guía) rejects; that is fine.
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [contentId, profile.loading, week]);

  return null;
}
