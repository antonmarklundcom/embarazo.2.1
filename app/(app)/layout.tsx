import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { FunnelBeacon } from "@/components/FunnelBeacon";
import { nearbyHasContent } from "@/lib/nav/nearby";

// APP SHELL (build spec §4/§6): header + fixed bottom tab bar wrap every (app) route.
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showNearby = await nearbyHasContent();
  return (
    <div className="min-h-dvh">
      <FunnelBeacon />
      <AppHeader />
      <main className="mx-auto max-w-md px-4 pb-28 pt-4 print:max-w-none print:p-0">
        {children}
      </main>
      <BottomNav showNearby={showNearby} />
    </div>
  );
}
