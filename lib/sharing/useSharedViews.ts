"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSharedViews, type SharedView } from "./client";

// BUILD-PLAN K2 — the companion's home screen is served, not stored.
//
// This hook deliberately does **not** cache anything to IndexedDB or
// localStorage. E1's promise is that "revoking access cuts everything
// instantly", and a copy of the owner's week sitting on a revoked companion's
// phone is exactly the thing that promise rules out. The cost is honest and
// visible: a companion with no connection sees "necesitás conexión", not a
// stale week. The rest of the app — guías, semanas, herramientas — still works
// offline for them, because none of it is somebody else's data.

export interface SharedViewsState {
  loading: boolean;
  /** Null means "we could not ask" (offline, no account, no server). */
  views: SharedView[] | null;
  reload: () => Promise<void>;
}

export function useSharedViews(): SharedViewsState {
  const [views, setViews] = useState<SharedView[] | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const next = await fetchSharedViews();
    setViews(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSharedViews().then((next) => {
      if (cancelled) return;
      setViews(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, views, reload };
}

/** The pregnancy this user is accompanying, if any. Owner views are not it. */
export function companionViewOf(
  views: SharedView[] | null,
): SharedView | null {
  return views?.find((view) => view.role !== "owner") ?? null;
}

/** This user's own pregnancy as the server sees it, if they have one. */
export function ownerViewOf(views: SharedView[] | null): SharedView | null {
  return views?.find((view) => view.role === "owner") ?? null;
}
