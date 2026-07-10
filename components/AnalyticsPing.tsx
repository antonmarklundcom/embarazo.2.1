"use client";

import { useEffect } from "react";
import { useProfile } from "@/lib/useProfile";

// Privacy-safe "open" ping (build plan P1.3). Fires at most once per calendar
// day per device, tracked with a stored DATE string — never a generated id,
// so no device can be followed across days. Only sends once a profile exists
// (so we have a mode); pre-onboarding opens are not counted. Failures are
// silent and never affect the app.
const LAST_OPEN_KEY = "analytics.lastOpen";

export function AnalyticsPing() {
  const profile = useProfile();

  useEffect(() => {
    if (profile.loading || !profile.hasProfile) return;
    if (typeof localStorage === "undefined") return;

    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_OPEN_KEY) === today) return;
    // Optimistically record the date first so a re-render can't double-send.
    localStorage.setItem(LAST_OPEN_KEY, today);

    void fetch("/api/v1/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "open",
        mode: profile.mode,
        ...(profile.trimester ? { trimester: profile.trimester } : {}),
        ...(profile.department ? { department: profile.department } : {}),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [profile.loading, profile.hasProfile, profile.mode, profile.trimester, profile.department]);

  return null;
}
