"use client";

import { useEffect, useState } from "react";
import { installDevice, type InstallDevice } from "./installDevice";
import { isTwaReferrer, TWA_SESSION_KEY } from "./rating/playReview";
import { PLAY_URL, offerPlayLink } from "./install/offer";
import { flush, noteInstall } from "./stats/funnel.client";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Detects standalone/installed mode (iOS + standard) so install UI hides once installed. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this instead of matchMedia support.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Whether this session runs inside the Android (Play) wrapper. The TWA sets an
 * `android-app://` referrer on the launch navigation only, so it is remembered
 * for the session (same key `HomeShortcuts` uses).
 */
export function isInsideTwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (isTwaReferrer(document.referrer)) sessionStorage.setItem(TWA_SESSION_KEY, "1");
    return sessionStorage.getItem(TWA_SESSION_KEY) === "1";
  } catch {
    return isTwaReferrer(document.referrer);
  }
}

/** P1.1 (BUILD-PLAN.md): install UX for the "installs from a link" distribution model. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [insideTwa, setInsideTwa] = useState(false);
  const [device, setDevice] = useState<InstallDevice | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    setInsideTwa(isInsideTwa());
    setDevice(installDevice(navigator.userAgent, navigator.maxTouchPoints));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      // Night run item 3. Several mounted cards may hear the same event; the
      // device-side "once" makes that one count.
      noteInstall("installed");
      void flush();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    // Night run item 3 — her answer to the browser's own dialog.
    noteInstall(choice.outcome === "accepted" ? "accepted" : "dismissed");
    void flush();
    setDeferred(null);
  }

  const installedHere = standalone || installed || insideTwa;
  return {
    // Chrome/Android: native prompt available.
    canPromptInstall: !!deferred && !installedHere,
    promptInstall,
    // iOS Safari never fires beforeinstallprompt: show manual instructions.
    showIosInstructions: device === "iphone" && !installedHere,
    device,
    isStandalone: installedHere,
    /** Night run item 2 — the Play listing to offer, or null. */
    playUrl: offerPlayLink({ playUrl: PLAY_URL, device, insideTwa }) ? PLAY_URL : null,
  };
}
