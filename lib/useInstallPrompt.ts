"use client";

import { useEffect, useState } from "react";
import { installDevice, type InstallDevice } from "./installDevice";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Detects standalone/installed mode (iOS + standard) so install UI hides once installed. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this instead of matchMedia support.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** P1.1 (BUILD-PLAN.md): install UX for the "installs from a link" distribution model. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [device, setDevice] = useState<InstallDevice | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    setDevice(installDevice(navigator.userAgent, navigator.maxTouchPoints));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
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
    setDeferred(null);
  }

  return {
    // Chrome/Android: native prompt available.
    canPromptInstall: !!deferred && !standalone && !installed,
    promptInstall,
    // iOS Safari never fires beforeinstallprompt: show manual instructions.
    showIosInstructions: device === "iphone" && !standalone && !installed,
    device,
    isStandalone: standalone || installed,
  };
}
