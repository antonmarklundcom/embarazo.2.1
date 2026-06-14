"use client";

import { useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { Onboarding } from "@/components/Onboarding";
import { PlaneandoHome } from "@/components/PlaneandoHome";

// Home for "planeando / buscando" mode (build spec §3). Reachable directly and
// rendered on Inicio when the mode is active.
export default function PlaneandoPage() {
  const profile = useProfile();
  const [, setNonce] = useState(0);

  if (profile.loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-2/3 animate-pulse rounded-tile bg-black/5" />
        <div className="h-40 animate-pulse rounded-card bg-black/5" />
      </div>
    );
  }

  if (!profile.hasProfile) {
    return <Onboarding onDone={() => setNonce((n) => n + 1)} />;
  }

  return <PlaneandoHome />;
}
