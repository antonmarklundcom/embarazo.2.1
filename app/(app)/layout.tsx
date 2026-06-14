import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

// APP SHELL (build spec §4/§6): header + fixed bottom tab bar wrap every (app) route.
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 pb-28 pt-4 print:max-w-none print:p-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
