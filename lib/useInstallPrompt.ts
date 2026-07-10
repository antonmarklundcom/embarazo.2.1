"use client";

import { useEffect, useState } from "react";

// Install UX (build plan P1.1). The app's whole distribution model is
// "installs from a link", so we make the install action first-class instead
// of relying on the browser's own (easily-missed) affordance.

// The non-standard beforeinstallprompt event (Chromium only).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  | { kind: "unavailable" } // already installed, or browser gives no signal
  | { kind: "prompt"; promptInstall: () => Promise<void> } // Chromium prompt ready
  | { kind: "ios" }; // iOS Safari: must show manual instructions

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes navigator.standalone instead of display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // Exclude in-app browsers / Chrome on iOS (CriOS/FxiOS) where "add to home
  // screen" isn't available in the same way.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIosSafari());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return { kind: "unavailable" };

  if (deferred) {
    return {
      kind: "prompt",
      promptInstall: async () => {
        await deferred.prompt();
        await deferred.userChoice;
        // The event can only be used once; appinstalled will finalize state.
        setDeferred(null);
      },
    };
  }

  if (ios) return { kind: "ios" };
  return { kind: "unavailable" };
}
