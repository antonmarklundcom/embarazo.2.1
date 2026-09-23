"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// An `<img>` that 404s in server-rendered HTML fails *before* React hydrates,
// so its `onError` prop never runs: the browser's broken-image icon and alt
// text stay on screen instead of the fallback. The week pages are SSG, and
// `public/assets/semanas/` is empty, so that was every /semana/N hero.
//
// This keeps `onError` for later failures and, on mount, also checks for one
// that already happened (`complete` with no pixels).
export function useImageFailed<T extends HTMLImageElement = HTMLImageElement>() {
  const ref = useRef<T>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const onError = useCallback(() => setFailed(true), []);

  return { ref, failed, onError };
}

/**
 * The other direction: `true` only once the image has actually decoded.
 *
 * For a slot that should show its fallback *until* the asset proves it
 * exists — the week renders, which are still missing — so the page never
 * paints the "render" layout first and then flips to the fallback after
 * hydration. Same pre-hydration catch as above: an image that finished
 * before React attached `onLoad` is found on mount.
 */
export function useImageLoaded<T extends HTMLImageElement = HTMLImageElement>() {
  const ref = useRef<T>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  const onLoad = useCallback(() => setLoaded(true), []);

  return { ref, loaded, onLoad };
}
