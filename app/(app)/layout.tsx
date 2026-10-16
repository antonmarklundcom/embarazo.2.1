import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { FunnelBeacon } from "@/components/FunnelBeacon";
import { nearbyHasContent } from "@/lib/nav/nearby";
import { AccountEntryGate } from "@/components/AccountEntryGate";

// The shell gives content room on larger screens while keeping forms readable.
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showNearby = await nearbyHasContent();
  return (
    <div className="min-h-dvh">
      <FunnelBeacon />
      <AccountEntryGate>
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-3xl scroll-mt-[calc(5rem+env(safe-area-inset-top))] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 print:max-w-none print:p-0"
        >
          {children}
        </main>
        <BottomNav showNearby={showNearby} />
      </AccountEntryGate>
    </div>
  );
}